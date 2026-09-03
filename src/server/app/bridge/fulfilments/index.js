/**
 * Bridge — model `fulfilments` -> page `answers`.
 *
 * A pure, storage-agnostic projection between the two shapes:
 *
 *   `answers`     nested POJO keyed by obligation name. Collections are
 *                 positional arrays in `lib/path.js`'s `a.b[0].c` grammar:
 *                 `answers.commodityLines[0].animalIdentifiers[1].animalIdentifierPassport`.
 *
 *   `fulfilments` flat map keyed by the obligation UUID (`obligation.id`,
 *                 NOT `name` — verified against `evaluator.js`'s
 *                 `dropUnknownFulfilments`/`buildObligationsById`). Grouped
 *                 values are records-maps `{ fulfilmentIndex: value }` whose
 *                 fulfilmentIndex is a `.`-delimited composite of one segment
 *                 per enclosing group (`line0` at depth 1, `line0.unit1` at
 *                 depth 2). Top-level scalars store the value directly.
 *
 * An obligation's `name` is its answers key, its `id` is its fulfilments UUID,
 * and its `within` chain gives its depth. Group obligations
 * (`commodityLines`, `animalIdentifiers`) carry no value of their own —
 * their instances are inferred from descendant records — so the bridge
 * rebuilds the answer arrays from the leaves.
 *
 * Forward input assembly is feature-owned in `features/<feature>/evaluation.js` and
 * coordinated by `assemble-fulfilments.js`.
 */

export { fulfilmentIndexToPath } from './fulfilment-index-path.js'
export { projectAnswers } from './project-answers/index.js'
