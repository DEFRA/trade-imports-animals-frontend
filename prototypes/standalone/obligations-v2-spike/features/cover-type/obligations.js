/**
 * Choose your cover — the obligation defs this feature owns. Pure data;
 * imports nothing outward.
 *
 * `excessAmount` is a conditional reveal scoped/wiped by `voluntaryExcess`
 * (both owned here, so the reference is internal to this feature). The reveal
 * MARKUP is page-side; only scope + wipe live on the def.
 */
export const coverType = { id: 'coverType', required: true }
export const voluntaryExcess = { id: 'voluntaryExcess' }
export const excessAmount = {
  id: 'excessAmount',
  activatedBy: { obligation: voluntaryExcess, equals: 'yes' },
  wipeOnExit: true
}

export const defs = [coverType, voluntaryExcess, excessAmount]
