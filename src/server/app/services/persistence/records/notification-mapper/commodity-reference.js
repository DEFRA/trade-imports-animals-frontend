import { setKeyed } from '../../../../shared/set-context.js'

const store = setKeyed('Commodity reference')

const reference = () => store.current()

export const configureCommodityReference = (setId, commodityReference) => {
  store.configure(setId, commodityReference)
}

export const typeTextForId = (...args) => reference().typeTextForId(...args)
