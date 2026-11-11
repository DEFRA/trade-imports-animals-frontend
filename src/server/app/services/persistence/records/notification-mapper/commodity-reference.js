import { setKeyed } from '../../../../shared/set-context.js'

const store = setKeyed('Commodity reference')

const reference = () => store.current()

export const configureCommodityReference = (setId, commodityReference) => {
  store.configure(setId, commodityReference)
}

export const commodityNameFor = (commodityCode) =>
  reference().commodityNameFor(commodityCode)

export const commodityDescriptionFor = (commodityCode) =>
  reference().commodityDescriptionFor(commodityCode)
