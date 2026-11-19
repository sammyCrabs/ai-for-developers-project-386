# Браузерный сценарий против настоящего сервера

Research for issue #11. Question: which tool to use, and how to run a browser scenario against the built backend that serves the frontend, inside `mise run check` locally and in CI.

Date: 2026-11-19. Repo state: branch `Call-calendar` @ `bfeb1f8`.

## Short answer

- **Tool:** Playwright Test (`@playwright/test`, latest `1.65.1` on npm as of 2026-11-19), Chromium only, headless shell.
- **Package:** a new workspace package `e2e/` (`@call-calendar/e2e`) holding `playwright.config.ts` and the specs.
- **Server:** Playwright's `webServer` starts the **built** backend (`node backend/dist/server.js`) with `STATIC_DIR=frontend/dist`. That is the same artifact the Docker runtime stage runs, without the container. Do not use the mise dev daemons or the Docker image.
- **Port:** a dedicated port, `8081`. It must not collide with the dev daemons (3000, 5173) or the Docker port (8080). Set `reuseExistingServer: false` so a stray process fails loudly instead of being tested by mistake.
- **mise:** a task `e2e` with `depends = ["build"]` that installs the browser and runs `playwright test`. Add it to `check.depends`. CI already runs `mise run check`, so `ci.yml` needs no new check step (AGENTS.md rule).
- **Browsers:** `playwright install --only-shell chromium`, plus `--with-deps` only when `CI` is set. Do not cache browsers in CI.
- **Data isolation:** each `playwright test` run starts a fresh server process. Inside a run, every test creates its own uniquely named data, and `workers: 1` is used in CI.
- **Cost (estimate, not measured):** about +1 to 2 min in CI (browser download, apt deps, build), a few seconds per scenario. Locally, after the first install, roughly the time of `mise run build` plus a few seconds.

## Repo facts this builds on

- `backend/src/app.ts`: `buildApp({ staticDir })` registers the API under `/api` and serves `staticDir` with an SPA fallback to `index.html`. `backend/src/server.ts` reads `PORT` (default 3000), `HOST` (default 127.0.0.1) and `STATIC_DIR`.
- `Dockerfile` runtime stage: `NODE_ENV=production`, `PORT=8080`, `STATIC_DIR=/app/frontend/dist`, `CMD node backend/dist/server.js`. The Hexlet check builds this image.
- `mise.toml`: `build` depends on `gen` and runs `pnpm -r --filter=!@call-calendar/contract build`. `check` depends on `lint`, `typecheck` and `test`. The daemons `backend` (`tsx watch`, :3000) and `frontend` (Vite, :5173) are dev servers.
- `.github/workflows/ci.yml`: `actions/checkout`, `jdx/mise-action@v5`, `pnpm install --frozen-lockfile`, `mise run check` on `ubuntu-latest`.
- `test` runs `pnpm -r --filter=!@call-calendar/contract test`, so **any** workspace package with a `test` script is picked up. Vitest is used in backend and frontend.

## Tool choice: Playwright Test

- The `webServer` option starts a server before tests and waits for it. Options include `command`, `url` (ready on 2xx, 3xx, 400, 401, 402 or 403), `reuseExistingServer`, `timeout` (default 60000 ms), `cwd` (default is the config directory), `env` (default `process.env` plus `PLAYWRIGHT_TEST=1`), `stdout` (default `ignore`) and `gracefulShutdown` (default is SIGKILL of the process group). An array of servers is allowed. `use.baseURL` makes `page.goto('./x')` relative. Source: https://playwright.dev/docs/test-webserver
- This fits the repo: one process serves both `/api` and `/`, so one `webServer` entry is enough, and the frontend calls the API on the same origin through the SDK's `/api` base path.
- The alternative of running specs in Vitest browser mode was not researched in depth. It targets components, not a real server, so it does not answer this question.

## Where the package lives

`e2e/` at the repo root, added to `pnpm-workspace.yaml`:

```
e2e/
  package.json        # @call-calendar/e2e, devDeps: @playwright/test (exact version), typescript 5.9.3, @types/node
  playwright.config.ts
  tsconfig.json
  tests/*.spec.ts
```

- Name the script `e2e`, **not** `test`. Otherwise `mise run test` (`pnpm -r ... test`) runs Playwright without a build and a browser. A `typecheck` script (`tsc --noEmit`) is fine and wanted, because `mise run typecheck` will then cover the specs.
- Add `test-results/`, `playwright-report/` and `blob-report/` to `.gitignore`.
- oxlint at the root already lints every directory.

## Starting the real server

Recommended config sketch (not tested):

```ts
// e2e/playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

const PORT = 8081;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node backend/dist/server.js",
    cwd: "..",                              // repo root
    url: `${baseURL}/api/health`,           // existing endpoint, 200 when ready
    env: { PORT: String(PORT), HOST: "127.0.0.1", STATIC_DIR: "frontend/dist", NODE_ENV: "production" },
    reuseExistingServer: false,
    stdout: "pipe",
    gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
  },
});
```

Why this option over the others:

| Option | Fidelity to production | Cost | Verdict |
|---|---|---|---|
| `webServer` running built `dist` (above) | Same JS and the same static bundle as the Docker runtime stage. Differences: no container, and full devDeps are installed | Only `mise run build` | **Recommended** |
| mise daemons (`backend` + `frontend`) | Dev servers (`tsx watch`, Vite with proxy), not the built artifact. They stay running after the task (mise docs: "Daemons keep running afterwards") | Low | Rejected: it does not test what ships, and leaves processes behind in `check` |
| `docker build` + `docker run` as `webServer.command` | Exact production image | Docker is needed locally and in `check`. Image build takes minutes. Harder to stop cleanly | Rejected for `check`. The Hexlet check already builds the image |

Sources: mise daemons and task deps: https://mise.jdx.dev/tasks/task-configuration.html. `webServer`: https://playwright.dev/docs/test-webserver.

## mise tasks

```toml
[tasks.e2e]
description = "Browser scenarios against the built server"
depends = ["build"]
run = [
  "pnpm --filter @call-calendar/e2e exec playwright install ${CI:+--with-deps} --only-shell chromium",
  "pnpm --filter @call-calendar/e2e e2e",
]

[tasks.check]
depends = ["lint", "typecheck", "test", "e2e"]
```

- `depends` edges run once and in parallel up to the `jobs` setting, so `gen` is shared by `typecheck`, `test` and `build`. A `run` array runs in order and stops at the first failure. Source: https://mise.jdx.dev/tasks/task-configuration.html
- `playwright install` is idempotent. When the browser is already in the cache it only checks and returns, so keeping it in the task is cheap locally. It also makes `mise run check` self-contained on a fresh machine.
- `${CI:+--with-deps}`: GitHub Actions sets `CI=true`. `--with-deps` installs OS packages with apt and sudo, which is needed on a Linux runner and unwanted on a developer's macOS. Hosted `ubuntu-latest` runners have passwordless sudo.

## Installing browsers

- One browser: `playwright install chromium`. With OS packages: `playwright install --with-deps chromium`. OS packages only: `playwright install-deps chromium`. Source: https://playwright.dev/docs/browsers
- `--only-shell` downloads only chromium-headless-shell. The docs recommend it for headless-only CI when `channel` is not set. Source: https://playwright.dev/docs/browsers
- Default cache: `~/Library/Caches/ms-playwright` on macOS, `~/.cache/ms-playwright` on Linux. `PLAYWRIGHT_BROWSERS_PATH` overrides it, and `0` installs into `node_modules`. Source: https://playwright.dev/docs/browsers
- CI caching: **not recommended**. Restoring the cache takes about as long as downloading, and Linux OS dependencies cannot be cached. If you cache anyway, key on the Playwright version. Source: https://playwright.dev/docs/ci
- The official GitHub Actions example installs browsers in a step (`npx playwright install --with-deps`) after `npm ci`, then uploads `playwright-report/` with `actions/upload-artifact` under `if: ${{ !cancelled() }}`, kept for 30 days. Source: https://playwright.dev/docs/ci-intro. Here the install moves into the mise task. An optional upload-artifact step for the report is the only `ci.yml` change worth making. It is not a check, so the "checks go in `mise run check`" rule still holds.
- Alternative: run the job in `mcr.microsoft.com/playwright:v<version>-noble` via `container:`, which has browsers and deps preinstalled. Source: https://playwright.dev/docs/ci. Rejected: the image's Node must match `mise.toml`, the version must be bumped together with `@playwright/test`, and `mise-action` would still install tools.

## Isolating data between runs

- **Between runs:** `webServer` starts a new server process for every `playwright test` and kills it afterwards. With `reuseExistingServer: false`, a run never attaches to an old server. If storage stays in memory, each run starts empty. Storage is decided in a separate ticket. If it becomes a file or SQLite, pass a fresh path through `webServer.env` (for example a temp directory created in the config file) instead of adding a reset endpoint to the API.
- **Between tests in a run:** Playwright gives each worker an isolated BrowserContext, but backend records are shared external state. The docs suggest building unique data per worker or test with `testInfo.workerIndex` or `testInfo.testId`, and worker-scoped fixtures for setup and teardown. Source: https://playwright.dev/docs/test-parallel. Practical rule: every scenario creates its own Meeting Type with a unique name (for example a `testInfo.testId` suffix) and asserts only on it.
- **Booking conflicts** are global to one Owner (ADR-0001). Scenarios that book slots should pick distinct days or types, or run in one file in order. `test.describe.configure({ mode: 'serial' })` exists, but the docs advise against it. Source: https://playwright.dev/docs/test-parallel
- **CI:** the docs recommend `workers: 1` for stability. Source: https://playwright.dev/docs/ci

## Runtime cost (estimates, not measured)

| Step | CI (`ubuntu-latest`, cold) | Local (warm) |
|---|---|---|
| chromium-headless-shell download | ~10–30 s (about 100 MB) | 0 (cached, check only) |
| `--with-deps` apt install | ~20–60 s | n/a (macOS) |
| `mise run build` (tsc + vite) | part of check, ~15–30 s | same |
| Server start + 3–5 scenarios | ~5–15 s | ~5–15 s |
| **Added to `check`** | **~1–2 min** | **~build time + seconds** |

Measure on the first real CI run and update this table.

## Open points for the implementation ticket

- Pin `@playwright/test` to an exact version, like the other devDeps in the repo.
- Keep `e2e` in `check`, as the ticket asks. A fast local loop without the browser is still available through `mise run lint typecheck test`.
- After the storage ticket is decided, revisit "Isolating data" (in-memory vs file path through `env`).
