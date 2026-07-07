export const coverType = { id: 'coverType', required: true }
export const voluntaryExcess = { id: 'voluntaryExcess' }
export const excessAmount = {
  id: 'excessAmount',
  activatedBy: { obligation: voluntaryExcess, equals: 'yes' },
  wipeOnExit: true
}

export const obligations = [coverType, voluntaryExcess, excessAmount]
