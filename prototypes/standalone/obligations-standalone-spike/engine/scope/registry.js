/**
 * Registry mechanics for named scope predicates. Scoping is engine
 * functions, never declared on the obligation record or in flow.json
 * (obligations.md:196, 205-236 — the Container-level `appliesWhen` names in
 * flow.json are a separate Flow concern resolved by flow-eval).
 *
 * A rule is `(view, externalState) -> falsy | { status?, reasons? }`:
 * falsy means the rule did not fire; a returned outcome brings the
 * obligation into scope, `status` defaulting to 'optional'. Several rules
 * may target one obligation (convergent obligations) — the evaluator folds
 * firings with most-restrictive-wins.
 */
export const createScopeRegistry = () => {
  const rules = new Map()

  return {
    /** Register a named predicate against an obligation name. */
    register(obligationName, ruleName, when) {
      if (typeof when !== 'function') {
        throw new Error(`Scope rule "${ruleName}" must be a function`)
      }
      const existing = rules.get(obligationName) ?? []
      if (existing.some((rule) => rule.ruleName === ruleName)) {
        throw new Error(
          `Scope rule "${ruleName}" already registered for "${obligationName}"`
        )
      }
      rules.set(obligationName, [...existing, { ruleName, when }])
    },

    /** Rules for one obligation, in registration order ([] if none). */
    rulesFor: (obligationName) => rules.get(obligationName) ?? [],

    has: (obligationName) => rules.has(obligationName),

    /** Every obligation name a rule is registered against. */
    obligationNames: () => [...rules.keys()],

    /** Model-coverage assertion: every registered name must be real. */
    assertCoverage(knownNames) {
      const known = new Set(knownNames)
      const unknown = [...rules.keys()].find(
        (obligationName) => !known.has(obligationName)
      )
      if (unknown) {
        throw new Error(`Scope rules target unknown obligation "${unknown}"`)
      }
    }
  }
}
