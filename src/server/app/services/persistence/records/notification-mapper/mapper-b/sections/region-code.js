import { obligationSet } from '../../../../../../model/obligations/manifest.js'

export const applyRegionCodeOverlay = (notification, reader) => {
  const { regionCode } = obligationSet()
  const region = reader.scalar(regionCode)
  if (region !== undefined) {
    notification.origin = { ...notification.origin, regionCode: region }
  }
}
