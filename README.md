# advisorflow-web

The Angular frontend for **AdvisorFlow CRM**, a financial advisory CRM prototype. Advisors browse households, their members and the advisory opportunity pipeline here (follow-up tasks arrive with M5). All data comes from [`advisorflow-api`](../advisorflow-api), which mediates every Salesforce call. This app never holds Salesforce credentials.

> Portfolio prototype. All records are fictional.

| | |
|---|---|
| Stack | Angular 22, TypeScript, Tailwind CSS 4, Vitest |
| API contract | `advisorflow-api` OpenAPI **v1** (built against 1.3.0, see `src/app/core/api-contract.ts`) |
| Deploys to | Azure Static Web Apps, automatically on push to `main` after CI passes: https://zealous-pebble-02abce610.4.azurestaticapps.net |
| Repo decision | Separate frontend and backend repositories (blueprint v1.3 §11.5A) |

## Run locally

Start the API first (see the `advisorflow-api` README). It listens on `http://localhost:5080`.

```bash
npm install
npm start          # http://localhost:4200
```

In development, `proxy.conf.json` forwards `/api` and `/health` to `localhost:5080`, so the browser makes same-origin requests and no CORS setup is needed.

```bash
npx ng test --watch=false     # unit tests
npx ng build                  # production build -> dist/advisorflow-web
```

## Configuration

| File | `apiBaseUrl` | Used by |
|---|---|---|
| `src/environments/environment.development.ts` | `''` (dev proxy) | `ng serve`, `ng build --configuration development` |
| `src/environments/environment.ts` | `https://app-advisorflow-api-ee1.azurewebsites.net` | `ng build` (production) |

When the API is deployed, set the production `apiBaseUrl`. Then add this site's origin to the API's `Cors:AllowedOrigins`.

## Structure

```
src/app/core/                     API client (httpResource), contract models, contract version
src/app/features/households/      Households list (search, status filter, paging) and detail
src/app/features/contacts/        Household members list
src/app/features/opportunities/   Pipeline board (by stage, advisory fees) and a household's opportunities
src/app/shared/                   Reusable UI (status and stage badges, dates)
src/environments/                 Per-environment API base URL
.github/workflows/ci.yml          Prettier check, production build, tests, npm audit, deploy to Static Web Apps (push to main)
```

Project status, next steps and working rules for both repos: `advisorflow-api/docs/project-status.md`.

## Working with the API contract

The models in `src/app/core/households.models.ts` and `opportunities.models.ts` mirror `advisorflow-api/docs/api/openapi.v1.yaml`.

- **Minor API versions (1.x)** only add optional fields or endpoints. This app keeps working, and new fields can be adopted when needed.
- **A major API version (2.0)** means updating the models, `API_CONTRACT_VERSION`, and the tests in one pull request, before switching to the new API path.
