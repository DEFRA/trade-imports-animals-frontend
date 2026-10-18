# trade-imports-animals-frontend

The live-animals notification journey, built on the set-agnostic platform in
`src/server/app/`. Start with
[`src/server/app/docs/README.md`](src/server/app/docs/README.md), and for a
journey change follow the recipes in
[`src/server/app/sets/live-animals/docs/`](src/server/app/sets/live-animals/docs/README.md).

## Code quality

- A comment describes only the lines below it, and only when a name or extraction cannot. No claims about callers, other modules, the backend, a library or a test. No counts.
- No ticket keys, backlog or ruling ids, release names or session words in code, comments or test titles. `npm run lint` enforces this.
- No history: no before/after narration, no `REMOVED_*`, no "renamed from".
- A name predicts what the code returns and changes. No positional boolean flags, no metaphors, one name per concept. A rename covers the whole vocabulary.
- Set-up used by two tests goes in the shared helper; promoting a helper deletes the local copies.
- Every branch that changes an outcome logs once through `request.logger` with the ids support searches by. Log `{ err }`, never only a message. No bodies at INFO.
- A test title states what its assertions prove, and the test fails without the change it covers.
- Canonical text: `.claude/rules/code-quality.md` in the trade-imports-workspace repo.
