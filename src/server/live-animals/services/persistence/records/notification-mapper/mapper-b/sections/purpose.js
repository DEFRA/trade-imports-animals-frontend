import { purposeInInternalMarket } from '../../../../../../model/obligations/obligations.js'

export const applyPurposeOverlay = (notification, reader) => {
  const purpose = reader.scalar(purposeInInternalMarket)
  if (purpose !== undefined) notification.purpose = purpose
}
