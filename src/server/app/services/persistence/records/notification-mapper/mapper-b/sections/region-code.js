import { regionCode } from '../../../../../../model/obligations/obligations.js'

export const applyRegionCodeOverlay = (notification, reader) => {
  const region = reader.scalar(regionCode)
  if (region !== undefined) {
    notification.origin = { ...notification.origin, regionCode: region }
  }
}
