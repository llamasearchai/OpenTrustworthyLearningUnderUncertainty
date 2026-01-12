## Publishing to GitHub (professional history)

Target repository: [llamasearchai/OpenTrustworthyLearningUnderUncertainty](https://github.com/llamasearchai/OpenTrustworthyLearningUnderUncertainty)

### Recommended PR structure

Keep changes reviewable and logically grouped. Suggested PRs:

1. **chore(repo): hygiene + tooling**
   - `.gitignore`, `.dockerignore`, docs, CI workflows
2. **feat(docker): docker-compose + production-ish containers**
   - `Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`
3. **test(frontend): raise and enforce coverage**
   - Coverage exclusions documented, tests added

### Commit conventions

- Prefer conventional commits (e.g. `chore: ...`, `feat: ...`, `test: ...`, `fix: ...`).
- Keep commits atomic (one theme per commit).
- Avoid committing generated output (`frontend/dist`, `frontend/coverage`, `frontend/playwright-report`, etc.).

### Initial push (fresh repo)

From the project root:

```bash
git init
git branch -M main
git add .
git commit -m "chore: initial import (backend + frontend + CI + docker)"
git remote add origin git@github.com:llamasearchai/OpenTrustworthyLearningUnderUncertainty.git
git push -u origin main
```

### PR-based workflow (recommended after initial push)

```bash
git checkout -b feat/dockerization
git add .
git commit -m "feat(docker): add docker-compose for backend + frontend"
git push -u origin feat/dockerization
```

Then open a PR and squash-merge with a clean title/body.

