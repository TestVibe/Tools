# Tools Agent Guide

## Purpose
This guide defines how to add and maintain provider tools under `Tools/` so they work correctly in TestVibe's Tools Manager and runtime.

## Folder Layout
Each provider lives in its own folder:

- `Tools/<Provider>/tools.js`: exported tool functions and metadata.
- `Tools/<Provider>/init-script.js`: optional provider initialization logic.
- `Tools/<Provider>/logo.png`: provider icon shown in the UI.

Current providers follow this structure (`Anthropic`, `Gemini`, `GitHub`, `Jira`, `Mandrill`, `OpenAI`, `Slack`, `Teams`, `Twilio`, `Wisej.NET`).

## Required JavaScript Conventions
- Export tools with CommonJS:
  - `module.exports = { toolA, toolB }`
- Tool functions should be `async function <name>(...) { ... }`.
- Prefer a single object parameter for exported tools:
  - `async function createIssue({ owner, repo, title, body } = {}) { ... }`
- Keep helper functions private (not exported) unless they are intended tools.
- Do not hardcode secrets or tokens in source.

## Metadata Directives
Use `//#Key=Value` directives for package- and tool-level metadata.

### Package-level metadata (required at top of file)
- `//#PackageDescription=...`
- `//#PackageVersion=...`
- `//#Variables=VAR_ONE,VAR_TWO` (non-secret provider configuration)
- `//#Secrets=SECRET_ONE,SECRET_TWO` (sensitive provider configuration)
- Optional: `//#PageBound=true` for providers that require the Playwright page to be injected by the runner.
- `//#Example=...` (can appear multiple times)

### Tool-level metadata (place directly above each exported function)
- `//#Summary=...`
- `//#Description=...`
- Optional: `//#Params=paramOne,paramTwo` to declare the user-facing input contract explicitly.
- `//#ReturnsType=...`
- `//#ReturnsValue=...`
- Optional: `//#Example=...`

Important:
- Do not define `//#Variables` per-function.
- Do not define `//#Secrets` per-function.
- Keep variables and secrets declared only once at the top of the file.

## Secrets vs Variables
TestVibe reads provider configuration from top-level metadata.

- **Secrets**: keys listed in top-level `//#Secrets=...` (for example API keys/tokens).
- **Variables**: keys listed in top-level `//#Variables=...` for non-secret config.

Rule:
- Every environment key used by provider tools must be declared at top-of-file in either `//#Variables` or `//#Secrets`.
- Example:
  - Secret: `OPENAI_API_KEY` (list in `//#Secrets`).
  - Variable: `OPENAI_MODEL` (list in `//#Variables`).

## Error Handling
- Throw clear errors for missing required inputs.
- Throw clear errors for missing required environment values.
- Include HTTP status and response body text for failed remote requests when safe.
- Never log or return secret values.

## Implementation Guidelines
- Keep each tool focused on one use case.
- Normalize flexible input shapes near the function boundary.
- Return deterministic, JSON-serializable values.
- Avoid side effects outside the tool's responsibility.

## Update Checklist
Before submitting changes in `Tools/`:

1. Confirm exported functions are present in `module.exports`.
2. Confirm each exported function has tool-level metadata.
3. Confirm all non-secret env keys are listed in top-level `//#Variables`.
4. Confirm all secret env keys are listed in top-level `//#Secrets`.
5. Confirm no secrets are hardcoded.
6. Confirm request failures produce actionable error messages.
7. Confirm `tools.js` remains valid JavaScript (no syntax errors).

## Scope
This document applies to files under `Tools/` only.
