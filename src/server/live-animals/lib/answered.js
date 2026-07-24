import { isBlankValue } from '../model/obligations/is-blank-value.js'

export const isBlank = isBlankValue
export const isAnswered = (value) => !isBlankValue(value)
