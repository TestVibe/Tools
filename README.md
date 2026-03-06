# TestVibe Tools

This folder contains provider tool packages consumed by TestVibe's Tools Manager and runtime.

## Current Provider Package Shape

Each provider now follows this structure:

- `Tools/<Provider>/tools.js`
- `Tools/<Provider>/tools.manifest.json`
- `Tools/<Provider>/init-script.js` (optional)
- `Tools/<Provider>/logo.png` (optional UI asset)

`tools.js` is the source of truth for provider tools today.

Current conventions:

- provider tools use CommonJS exports
- exported tools are `async function` implementations
- exported tools should prefer a single object parameter
- helper functions stay private unless they are intended tools
- provider metadata is declared with top-level `//#...` directives
- provider dependencies can be declared in `tools.manifest.json`

Example:

```js
//#PackageDescription=Example provider.
//#Variables=EXAMPLE_URL
//#Secrets=EXAMPLE_TOKEN

//#Summary=Ping service
//#Description=Calls a service health endpoint.
//#ReturnsType=object
//#ReturnsValue={"ok":true}
async function pingService({ path } = {}) {
  return { ok: true, path: path || "/health" };
}

module.exports = {
  pingService
};
```

## Validation Runtime

Provider tools under `Tools/` are separate from the Playwright validation runtime used by `validate_step`.

TestVibe now launches a local MCP runtime from:

- `Development/TestVibe/API/V1/playwright-mcp-local`

instead of relying on `npx @playwright/mcp@latest`.

That local runtime patches `browser_run_code` so validation snippets can use Node globals such as:

- `require`
- `process`
- `console`
- `Buffer`

This is specifically for validation/runtime execution. It does not change the current provider package format under `Tools/`, which remains `tools.js` plus metadata.

When `tools.manifest.json` exists, the Playwright runner will use it to:

- resolve the provider entry file
- honor `pageBound`
- install provider-local npm dependencies before loading the tool module

## Notes

- `init-script.js` is only needed for browser-side/page-bound helpers.
- If a provider eventually needs external npm dependencies, that should be treated as runtime/dependency-hosting work, not as a silent change to the `tools.js` file format.
- For the authoritative authoring rules for `Tools/`, see [AGENTS.md](/H:/GitHub/TestVibe/Tools/AGENTS.md).
