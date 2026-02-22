<!--
Guidance for AI coding agents working in this repository.
Keep this file short and actionable. Update when the repo gains real source files,
build tooling, or CI configuration.
-->

# Copilot instructions for SunActive

Repository snapshot (auto-discovered):

- `README.md` — contains only the project title `SunActive`. No source code, manifests, or CI.

If this file already exists, preserve any non-obvious, project-specific notes and only
append or replace sections marked `<!-- AI: editable -->`.

Quick contract for changes (what your patch should do)

- Inputs: small, focused change requests or a chosen stack (Node/Python/Go).
- Outputs: minimal, runnable scaffold (if requested) with one example feature, one test,
  and CI skeleton; or a precise doc/bugfix edit when asked.
- Error modes: don't add credentials, don't assume frameworks, and don't make breaking
  changes to unknown layouts.

What to do first (short checklist for new agents)

1. Scan top-level: look for `package.json`, `pyproject.toml`, `go.mod`, `Makefile`,
   `.github/workflows`, `src/`, `app/`, or `Dockerfile`.
2. If no stack detected, ask the human which language/framework to scaffold (one question).
3. If user approves a stack, create a minimal scaffold + one unit test + CI, run tests locally
   and show the diffs grouped by file.

Repo-specific heuristics (current state)

- Do not pick heavy opinionated frameworks without confirmation. Prefer small, well-known
  defaults: Express (Node) or a simple Flask/FastAPI helper (Python) only when requested.
- Keep scaffolds minimal: a single entry point (`src/index.js` or `src/main.py`), a `tests/`
  directory, a `README.md` update, and a GitHub Actions workflow that runs install + tests.

Concrete developer commands (macOS / bash)

Inspect repository:

```bash
git status --porcelain; ls -la
```

After creating a Node scaffold:

```bash
npm install
npm test
```

After creating a Python scaffold:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
pytest -q
```

Edge cases & gotchas to watch for

- Empty repo: always ask before adding a full-stack scaffold.
- Secrets/configs: do not create real credentials; add `.env.example` and document env vars.
- Large migrations: if a proposed change touches >5 files or adds heavy deps, ask for
  approval and split into small PRs.

Example PR template for agent-created changes

Title: [scaffold|feature|fix] — short description

Body:

- Intent: one-line description
- Files changed: list
- How to run: short copyable commands
- Smoke test: one expected output (e.g., `npm test` passes)

Key files to check before coding

- `README.md` — add quick start after scaffolding.
- Any root-level manifest if present: `package.json`, `pyproject.toml`, `go.mod`, `Makefile`.

<!-- AI: editable -->

Notes for future maintainers: once this repo contains source code, replace this file with
concrete patterns and examples (imports, logger conventions, error handling, module layout,
and typical CI commands) discovered from the actual codebase.
