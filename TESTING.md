# Testing

## Frontend Component Tests

Run the Vitest suite:

```sh
npm test
```

Run in watch mode:

```sh
npm run test:watch
```

Component tests live in `test/*.test.tsx`. The shared setup in `test/setup.ts` provides:

- `jsdom`
- `@testing-library/jest-dom`
- cleanup after each test
- mocked Tauri `invoke`
- mocked Tauri `listen`

Use `test/utils/tauri.ts` to mock Tauri command responses:

```ts
mockTauriCommands({
  ticket_exists_tauri: true,
  get_customer_from_ticket_tauri: customer,
});
```

## Browser Workflow Tests

Run Playwright tests:

```sh
npm run test:e2e
```

Open the Playwright UI:

```sh
npm run test:e2e:ui
```

Install Playwright browsers when needed:

```sh
npx playwright install
```

Browser workflow tests should live in `e2e/*.spec.ts`. Use these for operator flows that depend on focus, keyboard scanner input, modal layering, routing, and layout.

## Existing Rust Tests

Run the Tauri/Rust test suite from `src-tauri`:

```sh
cargo test
```
