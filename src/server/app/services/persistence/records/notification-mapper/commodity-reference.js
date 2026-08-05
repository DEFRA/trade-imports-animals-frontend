import { setKeyed } from '../../../../shared/set-context.js'

const store = setKeyed('commodity reference')

export const configureCommodityReference = (setId, implementation) => {
  store.configure(setId, implementation)
}

export const commodityCodeFor = (...args) =>
  store.current().commodityCodeFor(...args)

export const speciesLabel = (...args) => store.current().speciesLabel(...args)

export const typeTextForId = (...args) => store.current().typeTextForId(...args)
