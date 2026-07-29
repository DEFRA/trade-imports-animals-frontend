/**
 * alwaysInScope — no gate; the decision is unconditional. Retained
 * for the ONE case the data-only obligation shape cannot express: an
 * always-in-scope obligation that must attach a
 * `reasons` list to the decision object. The evaluator's `field`
 * classifier returns `{ inScope: true, status: obligation.status }`
 * — no reasons channel. Any always-in-scope obligation that needs to
 * annotate WHY (e.g. a status flip explained by upstream policy)
 * should use `applyTo: alwaysInScope('mandatory', [reason])` rather
 * than reintroducing a bare closure — the helper's metadata is
 * introspectable and its witness classifies as TRIVIAL.
 *
 * The always-in-scope sites carry NO reasons, so the data-only shape
 * absorbs them all; `alwaysInScope` sits idle on the manifest
 * today but is not deprecated — it is the reserved lane for the
 * "always in scope + reasons" combination the field branch cannot
 * express.
 *
 * The witness synthesiser reads `.metadata.type === 'alwaysInScope'`
 * and classifies as `WITNESS_KIND.TRIVIAL` — no closure execution,
 * no witness value.
 *
 * @param {string} status — 'mandatory' or 'optional'.
 * @param {Array} [reasons] — optional reasons to attach.
 */
export const alwaysInScope = (status, reasons) => {
  const decision = reasons
    ? { inScope: true, status, reasons }
    : { inScope: true, status }
  const fn = () => decision
  fn.metadata = {
    type: 'alwaysInScope',
    status,
    reasons: reasons ?? null
  }
  return fn
}
