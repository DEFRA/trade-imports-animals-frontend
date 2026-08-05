import { isBlankValue } from '../model/obligations/is-blank-value.js'

export { isBlankValue as isBlank } from '../model/obligations/is-blank-value.js'
export const isAnswered = (value) => !isBlankValue(value)
