export const CLEAN_DECIMAL = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/

const DECIMAL_VALUE = /^(-?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i

const decimalIdentity = (value) => {
  const [, sign, integer, fraction = '', exponent = '0'] =
    DECIMAL_VALUE.exec(value) ?? []
  const digits = `${integer}${fraction}`
  const firstSignificant = digits.search(/[1-9]/)
  if (firstSignificant === -1) {
    return '0'
  }

  const significant = digits.slice(firstSignificant).replace(/0+$/, '')
  const power = integer.length + Number(exponent) - firstSignificant - 1
  return `${sign}${significant}e${power}`
}

export const isLosslessMeasurementNumber = (value) => {
  if (typeof value !== 'string' || !CLEAN_DECIMAL.test(value)) {
    return false
  }
  const numeric = Number(value)
  return (
    Number.isFinite(numeric) &&
    decimalIdentity(value) === decimalIdentity(String(numeric))
  )
}

export const canonicalMeasurementNumber = (value) =>
  isLosslessMeasurementNumber(value) ? Number(value) : value
