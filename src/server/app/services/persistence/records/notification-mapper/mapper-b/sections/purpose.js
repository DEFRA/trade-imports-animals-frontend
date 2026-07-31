import { obligationSet } from '../../../../../../model/obligations/manifest.js'

export const applyPurposeOverlay = (notification, reader) => {
  const { purposeInInternalMarket } = obligationSet()
  const purpose = reader.scalar(purposeInInternalMarket)
  if (purpose !== undefined) notification.purpose = purpose
}
