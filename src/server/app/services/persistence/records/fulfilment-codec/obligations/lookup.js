import {
  groups,
  obligations
} from '../../../../../model/obligations/manifest.js'

export const obligationsById = {
  get: (id) => obligations().find((obligation) => obligation.id === id)
}
export const groupIds = {
  has: (id) => groups().some((group) => group.id === id)
}
