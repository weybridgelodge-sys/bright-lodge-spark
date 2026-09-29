# Enforce 320px portal responsiveness

## What will change
- Add a standing project rule requiring every new or modified interactive portal screen to be checked at exactly 320px before completion.
- Add an automated browser test that opens the real portal routes at 320px and fails when the page becomes wider than the viewport or controls extend beyond it.
- Drive coverage from the portal route definitions, with explicit minimum coverage for all Treasurer and Secretary tools, so route additions are visible to the test rather than maintained as an unrelated list.
- Add the browser test to the normal test command and keep the existing unit suite intact.

## Authentication and safety
- Use a test-only authenticated browser state or safe session injection; do not hardcode credentials, access tokens, or bypass production authorization.
- If a reusable real session cannot be safely guaranteed in every environment, the test will use the closest deterministic test-only authentication boundary and the limitation will be documented plainly.

## Verification
- Run all unit tests and the new 320px browser suite.
- Confirm the preview build remains clean.
