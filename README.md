# QA Technical Test Assignment

Automated Web UI and API test suites written in **TypeScript** with **Playwright**.

- **Web UI**: end-to-end checkout flow on [Swag Labs](https://www.saucedemo.com/), built with the Page Object Model (POM).
- **API**: CRUD coverage for the `/posts` endpoint of [JSONPlaceholder](https://jsonplaceholder.typicode.com/).

## Project structure

```
pages/               Page Object Model classes for the Web UI suite
  LoginPage.ts
  ProductsPage.ts
  CartPage.ts
  CheckoutPage.ts
tests/
  ui/
    checkout.spec.ts   Login -> add to cart -> checkout -> confirmation
  api/
    posts.spec.ts       Full CRUD lifecycle + supporting validations
playwright.config.ts    Test projects, reporters, base URLs
```

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
npm install
npx playwright install --with-deps chromium
```

## Running the tests

Run everything (UI + API):

```bash
npm test
```

Run only the Web UI suite:

```bash
npm run test:ui
```

Run only the API suite:

```bash
npm run test:api
```

Run the Web UI suite in a headed (visible) browser:

```bash
npm run test:headed
```

## Test report

Every run generates an HTML report in `playwright-report/`. Open the report from the last run with:

```bash
npm run report
```

A `list` reporter also prints per-test results to the console during the run.

## Design notes

### Web UI suite (`tests/ui/checkout.spec.ts`)

Follows the Page Object Model: each page (`LoginPage`, `ProductsPage`, `CartPage`, `CheckoutPage`)
encapsulates its own locators and actions, and locators use the site's stable `data-test`
attributes rather than CSS classes or text where possible. The main test walks through the full
scenario from the assignment (login -> verify products page -> add to cart -> verify cart contents
-> checkout -> confirmation message), with each stage wrapped in a `test.step` for readable
reporting. A second test covers the negative case (invalid login credentials).

### API suite (`tests/api/posts.spec.ts`)

JSONPlaceholder is a **mock** API: it validates and echoes requests but does not persist writes on
the server. This was confirmed by hand before writing assertions:

- `POST /posts` always returns a new resource with `id: 101`, but that id is never actually stored.
- A subsequent `GET /posts/101` returns `404`, since only ids 1-100 exist in the fixed seed data.
- `PATCH`/`PUT` echo back whatever was sent, but a follow-up `GET` returns the original, unmodified data.
- `DELETE` always returns `200` with an empty body, regardless of whether the id exists.

Rather than writing assertions that assume real persistence (which would either be misleading or
flaky against this particular API), the test suite validates what the API actually guarantees at
each step, and explicitly documents/asserts the simulated behavior so it's clear this is an
intentional design decision, not a bug:

- **Full lifecycle test** — runs CREATE, READ, UPDATE, VERIFY UPDATE, DELETE, and VERIFY DELETION
  against the *same id* end-to-end, matching the assignment's scenario. Each step asserts the
  correct status code and response shape; the two "verify" steps assert and document the `404`
  caused by JSONPlaceholder's non-persistence rather than assuming success.
- **Update semantics test** — PATCHes an existing seeded post (`id: 1`) to verify partial-update
  behavior in the immediate response: the targeted field changes, and every other field
  (`body`, `userId`, `id`) stays exactly the same.
- **Supporting validations** — checks the response schema/types for an existing post and confirms
  a truly nonexistent id (`999999`) returns `404`.
