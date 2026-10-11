import { speciesText } from './species-text.js'

const titleCase = (text) =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

export const speciesName = (entry) => titleCase(speciesText(entry))
