# OpenTLU (Trustworthy Learning in Uncertainty)

A (work in progress) rigorous engineering framework for building Trustworthy Learning-Based Models (LBMs) that operate reliably under uncertainty, distribution shift, and open-world conditions.

Author: Nik Jois <nikjois@llamasearch.ai>

## Screenshot

![OpenTLU Dashboard](docs/images/dashboard-screenshot.png)

The OpenTLU dashboard provides real-time visualization of uncertainty metrics, safety monitoring, and 3D scene analysis with out-of-distribution detection.

## Quickstart

1.  **Install**: `uv sync` or `pip install -e .[dev]`
2.  **Test**: `tox`

## Structure

- `src/opentlu/foundations`: Uncertainty types, Risk metrics
- `src/opentlu/safety`: Envelopes, Constraints
- `src/opentlu/runtime`: Closed-loop mitigation
- `src/opentlu/evaluation`: Stratified metrics
- `src/opentlu/active_learning`: Data acquisition

## Development & Testing

### Backend
Run unit tests with pytest:
```bash
pytest tests/unit/
```

### Frontend
Run unit tests:
```bash
cd frontend && pnpm test
```

Run unit tests with coverage (enforced thresholds):

```bash
cd frontend && pnpm test:coverage
```

### Development servers

Start both backend and frontend:

```bash
./scripts/start-dev.sh
```

### Docker

Build and run backend + frontend:

```bash
docker compose up --build
```

### Mock Data
The frontend uses deterministic mock data for validation. Key presets are defined in `frontend/src/tests/mocks/presets.ts` and automatically served by MSW handlers during development and testing. This ensures consistent scenarios, monitor states, and active learning samples.

## Publishing

Publishing guidance and a recommended PR structure live in `docs/PUBLISHING.md`. Target repo: `https://github.com/llamasearchai/OpenTrustworthyLearningUnderUncertainty`.
