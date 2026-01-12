from dataclasses import dataclass
from typing import List, NamedTuple, Optional, Literal
import numpy as np
from opentlu.foundations.contracts import UncertaintyEstimate, RiskAssessment


class SampleMetadata(NamedTuple):
    id: str
    uncertainty: UncertaintyEstimate
    risk: RiskAssessment
    novelty_score: float
    embedding: Optional[np.ndarray] = None  # Optional embedding for diversity


class AcquisitionConfig(NamedTuple):
    weight_uncertainty: float = 1.0
    weight_risk: float = 2.0
    weight_novelty: float = 0.5
    diversity_penalty: float = 0.1


@dataclass
class BatchSelectionResult:
    """Result from batch selection with diversity."""

    selected_ids: List[str]
    selected_indices: List[int]
    diversity_score: float  # Determinant or other diversity metric
    coverage_score: float  # Embedding space coverage
    method: str


def dpp_kernel(
    embeddings: np.ndarray,
    scores: np.ndarray,
    sigma: float = 1.0,
) -> np.ndarray:
    """
    Construct DPP L-kernel from embeddings and quality scores.

    L_ij = q_i * q_j * S_ij
    where q_i is quality score and S_ij is similarity.

    Args:
        embeddings: (N, D) embeddings
        scores: (N,) quality scores
        sigma: RBF kernel bandwidth

    Returns:
        (N, N) L-kernel matrix
    """
    n = len(embeddings)

    # Compute similarity matrix using RBF kernel
    # S_ij = exp(-||x_i - x_j||^2 / (2 * sigma^2))
    diffs = embeddings[:, np.newaxis, :] - embeddings[np.newaxis, :, :]
    sq_distances = np.sum(diffs**2, axis=2)
    similarity = np.exp(-sq_distances / (2 * sigma**2))

    # Add small jitter for numerical stability
    similarity = similarity + 1e-6 * np.eye(n)

    # L_ij = q_i * q_j * S_ij
    quality = np.clip(scores, 1e-10, None)  # Ensure positive
    quality = quality / np.max(quality)  # Normalize to [0, 1]
    L = np.outer(quality, quality) * similarity

    return L


def greedy_dpp_map(kernel: np.ndarray, k: int) -> List[int]:
    """
    Greedy MAP inference for DPP.

    Iteratively selects items that maximize the determinant.

    Args:
        kernel: (N, N) L-kernel matrix
        k: Number of items to select

    Returns:
        List of selected indices.
    """
    n = kernel.shape[0]
    k = min(k, n)

    if k == 0:
        return []

    selected: List[int] = []
    remaining = set(range(n))

    # Select first item with highest diagonal (quality)
    first = int(np.argmax(np.diag(kernel)))
    selected.append(first)
    remaining.remove(first)

    while len(selected) < k and remaining:
        best_idx = -1
        best_gain = -float("inf")

        for idx in remaining:
            # Compute log-det gain for adding this item
            # Use Cholesky update for efficiency in production
            test_selected = selected + [idx]
            submatrix = kernel[np.ix_(test_selected, test_selected)]

            try:
                # Log-det for numerical stability
                sign, logdet = np.linalg.slogdet(submatrix)
                gain = logdet if sign > 0 else -float("inf")
            except np.linalg.LinAlgError:
                gain = -float("inf")

            if gain > best_gain:
                best_gain = gain
                best_idx = idx

        if best_idx == -1:
            break

        selected.append(best_idx)
        remaining.remove(best_idx)

    return selected


def kmedoids_diverse_select(
    embeddings: np.ndarray,
    scores: np.ndarray,
    k: int,
    score_weight: float = 0.5,
) -> List[int]:
    """
    K-medoids style diverse selection.

    Iteratively selects samples that balance quality and distance from
    already selected samples.

    Args:
        embeddings: (N, D) embeddings
        scores: (N,) quality scores
        k: Number of items to select
        score_weight: Weight for quality vs diversity (0=pure diversity, 1=pure quality)

    Returns:
        List of selected indices.
    """
    n = len(embeddings)
    k = min(k, n)

    if k == 0:
        return []

    # Normalize scores
    scores = np.asarray(scores)
    if scores.max() > scores.min():
        norm_scores = (scores - scores.min()) / (scores.max() - scores.min())
    else:
        norm_scores = np.ones_like(scores)

    selected: List[int] = []
    remaining = set(range(n))

    # Select first with highest score
    first = int(np.argmax(norm_scores))
    selected.append(first)
    remaining.remove(first)

    # Precompute pairwise distances
    diffs = embeddings[:, np.newaxis, :] - embeddings[np.newaxis, :, :]
    distances = np.sqrt(np.sum(diffs**2, axis=2))

    while len(selected) < k and remaining:
        best_idx = -1
        best_combined = -float("inf")

        for idx in remaining:
            # Minimum distance to already selected
            min_dist = min(distances[idx, s] for s in selected)
            # Normalize distance
            if distances.max() > 0:
                norm_dist = min_dist / distances.max()
            else:
                norm_dist = 0

            # Combined score
            combined = score_weight * norm_scores[idx] + (1 - score_weight) * norm_dist

            if combined > best_combined:
                best_combined = combined
                best_idx = idx

        if best_idx == -1:
            break

        selected.append(best_idx)
        remaining.remove(best_idx)

    return selected


def compute_coverage(
    selected_embeddings: np.ndarray,
    all_embeddings: np.ndarray,
    radius: float = 1.0,
) -> float:
    """
    Compute embedding space coverage.

    Fraction of all embeddings within radius of at least one selected embedding.

    Args:
        selected_embeddings: (K, D) selected embeddings
        all_embeddings: (N, D) all candidate embeddings
        radius: Coverage radius

    Returns:
        Coverage fraction [0, 1]
    """
    if len(selected_embeddings) == 0:
        return 0.0

    # Compute distances from each point to nearest selected
    diffs = all_embeddings[:, np.newaxis, :] - selected_embeddings[np.newaxis, :, :]
    distances = np.sqrt(np.sum(diffs**2, axis=2))
    min_distances = np.min(distances, axis=1)

    covered = np.sum(min_distances <= radius)
    return float(covered / len(all_embeddings))


class DataAcquisitionPolicy:
    """
    Selects which samples to prioritize for labeling/training.
    Score = w_u * U(x) + w_r * R(x) + w_n * N(x)

    Supports diversity-aware selection via DPP or k-medoids.
    """

    def __init__(self, config: AcquisitionConfig):
        self.config = config

    def compute_scores(self, samples: List[SampleMetadata]) -> List[float]:
        """Compute raw acquisition scores for a batch of samples."""
        scores = []
        for s in samples:
            # Normalize terms roughly to 0-1 range if possible,
            # here we deal with raw values and assume weights handle scaling.
            u_term = self.config.weight_uncertainty * s.uncertainty.epistemic_score

            # Risk term: prioritized if risk is High (expected risk) or critical (tail risk)
            # We use expected_risk as the primary driver.
            r_term = self.config.weight_risk * s.risk.expected_risk

            n_term = self.config.weight_novelty * s.novelty_score

            score = u_term + r_term + n_term
            scores.append(score)
        return scores

    def select_batch(
        self,
        samples: List[SampleMetadata],
        batch_size: int,
        diversity_method: Optional[Literal["none", "dpp", "kmedoids"]] = None,
        diversity_weight: float = 0.5,
        embeddings: Optional[np.ndarray] = None,
    ) -> List[str]:
        """
        Select top-k samples with optional diversity.

        Args:
            samples: List of sample metadata
            batch_size: Number of samples to select
            diversity_method: "dpp" for DPP, "kmedoids" for k-medoids, None for top-k
            diversity_weight: Weight for diversity vs quality (kmedoids only)
            embeddings: Optional (N, D) embeddings. If not provided, uses sample.embedding.

        Returns:
            List of selected sample IDs.
        """
        if not samples:
            return []

        scores = np.array(self.compute_scores(samples))

        # Get embeddings if available
        if embeddings is None:
            # Try to extract from samples
            sample_embeddings = []
            for s in samples:
                if s.embedding is not None:
                    sample_embeddings.append(s.embedding)
            if len(sample_embeddings) == len(samples):
                embeddings = np.array(sample_embeddings)

        # If no diversity method or no embeddings, fall back to top-k
        if diversity_method is None or diversity_method == "none" or embeddings is None:
            sorted_indices = np.argsort(scores)[::-1]
            selected_indices = sorted_indices[:batch_size]
            return [samples[i].id for i in selected_indices]

        # Diversity-aware selection
        if diversity_method == "dpp":
            kernel = dpp_kernel(embeddings, scores)
            selected_indices = greedy_dpp_map(kernel, batch_size)
        elif diversity_method == "kmedoids":
            selected_indices = kmedoids_diverse_select(
                embeddings, scores, batch_size, score_weight=1 - diversity_weight
            )
        else:
            raise ValueError(f"Unknown diversity method: {diversity_method}")

        return [samples[i].id for i in selected_indices]

    def select_batch_with_metadata(
        self,
        samples: List[SampleMetadata],
        batch_size: int,
        diversity_method: Optional[Literal["none", "dpp", "kmedoids"]] = None,
        diversity_weight: float = 0.5,
        embeddings: Optional[np.ndarray] = None,
    ) -> BatchSelectionResult:
        """
        Select batch with full metadata including diversity metrics.

        Returns:
            BatchSelectionResult with selected IDs and diversity scores.
        """
        if not samples:
            return BatchSelectionResult(
                selected_ids=[],
                selected_indices=[],
                diversity_score=0.0,
                coverage_score=0.0,
                method="none",
            )

        scores = np.array(self.compute_scores(samples))

        # Get embeddings
        if embeddings is None:
            sample_embeddings = []
            for s in samples:
                if s.embedding is not None:
                    sample_embeddings.append(s.embedding)
            if len(sample_embeddings) == len(samples):
                embeddings = np.array(sample_embeddings)

        # Selection
        method = diversity_method or "none"
        if method == "none" or embeddings is None:
            sorted_indices = np.argsort(scores)[::-1]
            selected_indices = list(sorted_indices[:batch_size])
            method = "top_k"
        elif method == "dpp":
            kernel = dpp_kernel(embeddings, scores)
            selected_indices = greedy_dpp_map(kernel, batch_size)
        elif method == "kmedoids":
            selected_indices = kmedoids_diverse_select(
                embeddings, scores, batch_size, score_weight=1 - diversity_weight
            )
        else:
            raise ValueError(f"Unknown diversity method: {method}")

        # Compute diversity metrics
        if embeddings is not None and selected_indices:
            selected_embeddings = embeddings[selected_indices]

            # Diversity score: log-determinant of Gram matrix
            if len(selected_indices) > 1:
                gram = selected_embeddings @ selected_embeddings.T
                gram = gram + 1e-6 * np.eye(len(gram))
                try:
                    _, logdet = np.linalg.slogdet(gram)
                    diversity_score = float(logdet)
                except np.linalg.LinAlgError:
                    diversity_score = 0.0
            else:
                diversity_score = 0.0

            # Coverage score
            coverage_score = compute_coverage(selected_embeddings, embeddings)
        else:
            diversity_score = 0.0
            coverage_score = 0.0

        return BatchSelectionResult(
            selected_ids=[samples[i].id for i in selected_indices],
            selected_indices=selected_indices,
            diversity_score=diversity_score,
            coverage_score=coverage_score,
            method=method,
        )
