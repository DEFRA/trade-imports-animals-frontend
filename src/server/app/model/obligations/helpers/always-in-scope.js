/**
 * alwaysInScope — unconditional decision. The reserved lane for the
 * "always in scope + reasons" case that the `'unindexed'` classifier's
 * default `{ inScope: true, status: obligation.status }` cannot
 * express. Sits idle on the manifest today but not deprecated.
 *
 * The witness synthesiser reads `.metadata.gateType === 'alwaysInScope'`
 * and classifies as `WITNESS_KIND.TRIVIAL` — no closure execution,
 * no witness value.
 */
export const alwaysInScope = (status, reasons) => {
  const decision = reasons
    ? { inScope: true, status, reasons }
    : { inScope: true, status }
  const fn = () => decision
  fn.metadata = {
    gateType: 'alwaysInScope',
    status,
    reasons: reasons ?? null
  }
  return fn
}
