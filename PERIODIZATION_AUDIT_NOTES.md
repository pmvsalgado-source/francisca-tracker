# Periodization Audit Notes

Date: 2026-05-05

## Merge status

Ready to merge to `main`.

## What was validated

- `npm test -- --run` passed
- `npm run build` passed
- Periodization engine contract was audited against real dates
- Core business scenarios were validated against real calendar inputs
- Competition multi-day handling is consistent
- Debug logs were removed from the core periodization path
- Visual smoke check was completed

## Known compatibility point

`src/lib/periodization.js` remains a legacy compatibility wrapper.

It is still used by:

- `src/components/Training.jsx`
- `src/components/Calendar.jsx`
- `src/components/Home.jsx`

The wrapper returns a legacy contract that differs from the modern engine output.
This is intentional for now and should be treated as compatibility debt, not a bug.

## Risk accepted in this merge

- The wrapper is still live and could be a future source of contract confusion.
- This is acceptable for the current merge because the engine is stable and the UI paths that were audited are clean.

## Follow-up after main

Create a separate cleanup task to either:

- document the wrapper contract explicitly, or
- migrate remaining consumers to the modern engine contract.

Do not mix that cleanup with the current merge.

