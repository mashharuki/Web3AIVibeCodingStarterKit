# Repository Guidelines

## Project Structure & Module Organization
- Monorepo managed by pnpm workspaces. Expected layout:
  - `pkgs/frontend`: Next.js (App Router), TailwindCSS UI.
  - `pkgs/contract`: Hardhat smart contracts and scripts.
  - `docs/`: prompts, slides, diagrams for context.
  - `.github/instructions/`: agent prompts and coding rules used by contributors.
  - Root files such as `pnpm-workspace.yaml`, `package.json`, `biome.*`, `README.md`.

## Build, Test, and Development Commands
- Install: `pnpm install` (at repo root; sets up all workspaces).
- Frontend dev: `pnpm --filter frontend dev` (runs local Next.js server).
- Frontend build/start: `pnpm --filter frontend build` / `pnpm --filter frontend start`.
- Contracts compile/test: `pnpm --filter contract compile` / `pnpm --filter contract test`.
- Lint/format (Biome): `pnpm biome check .` and `pnpm biome format .` or `pnpm lint` if scripted.

## Coding Style & Naming Conventions
- TypeScript-first: annotate function params/returns; prefer explicit types.
- Indentation: 2 spaces; keep lines focused and readable.
- Constants: `UPPER_SNAKE_CASE`; functions/methods start with verbs.
- File names: kebab-case (`swap-card.tsx`), React components in `PascalCase.tsx`.
- DRY first: extract shared logic to `pkgs/*/src/lib` and reuse.
- Comments: keep concise; Japanese accepted for clarity when appropriate.

## Testing Guidelines
- Contracts: Hardhat + TypeChain; tests in `pkgs/contract/test/*.test.ts`. Run `pnpm --filter contract test`.
- Frontend: React Testing Library; place in `__tests__` or `*.test.tsx`. Run `pnpm --filter frontend test`.
- E2E: Playwright under `pkgs/frontend/e2e`. Aim to cover swap and liquidity flows.
- Prefer deterministic fixtures; prioritize edge cases and error paths.

## Commit & Pull Request Guidelines
- Commits: short, descriptive messages (Japanese OK), e.g., “設定を修正” or “Add AMM swap tests”. Reference issues with `#123` when relevant.
- PRs: clear description, scope, linked issues, and screenshots/GIFs for UI. Note contract addresses or env changes.
- CI hygiene: run lint, type-check, and tests locally before opening PRs.

## Security & Configuration Tips
- Store secrets (RPC keys, private keys) in `.env*`; never commit them. Add `.env*` to `.gitignore` if missing.
- Verify network (e.g., Sepolia) RPCs and contract addresses in a shared config before merges.
