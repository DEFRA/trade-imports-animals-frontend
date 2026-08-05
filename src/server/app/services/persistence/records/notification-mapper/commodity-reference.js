let implementation

const reference = () => {
  if (!implementation) {
    throw new Error('Commodity reference has not been configured')
  }
  return implementation
}

export const configureCommodityReference = (commodityReference) => {
  implementation = commodityReference
}

export const commodityCodeFor = (...args) =>
  reference().commodityCodeFor(...args)

export const speciesLabel = (...args) => reference().speciesLabel(...args)

export const typeTextForId = (...args) => reference().typeTextForId(...args)
