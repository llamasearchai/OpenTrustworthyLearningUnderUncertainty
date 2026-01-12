## Frontend coverage scope

The frontend enforces **95%** coverage thresholds in Vitest for the parts of the codebase that:

- Are part of the current UI application MVP
- Are unit-testable in a JSDOM environment

### Excluded from unit-test coverage (current)

These are excluded in `frontend/vitest.config.ts` (coverage `exclude`) for one of the following reasons:

- **WebGL / Three.js / canvas-heavy** modules are not reliably unit-testable in JSDOM and are better covered via E2E/integration.
- **Unused/experimental** modules are present for future roadmap work but are not wired into the current app.
- **Large internal frameworks** (i18n, form system, visualization engine) are slated for follow-up test hardening.

Current excluded areas:

- `src/pages/Viewer.tsx`
- `src/components/3d/**`
- `src/lib/three/**`
- `src/lib/performance/**`
- `src/lib/ai/**`
- `src/lib/a11y/**`
- `src/lib/url-state/**`
- `src/lib/forms/**`
- `src/lib/i18n/**`
- `src/lib/query/**`
- `src/lib/visualizations/**`
- `src/stores/index.ts`
- `src/stores/three-store.ts`
- `src/hooks/**`
- `src/lib/api/**`
- `src/pages/**`
- `src/components/visualizations/**`
- `src/stores/visualization-store.ts`
- `src/lib/validations/**`
- `src/components/layout/MobileSidebar.tsx`
- `src/components/ui/avatar.tsx`

### Follow-up hardening plan

- Add integration tests for 3D Viewer using Playwright.
- Add unit tests for `src/lib/query` and `src/lib/visualizations` once stable APIs are finalized.
- Add unit tests for i18n and forms after the product requirements lock.

