import {
  groups,
  obligations
} from '../../../../../model/obligations/obligations.js'

export const obligationsById = new Map(
  obligations.map((obligation) => [obligation.id, obligation])
)
export const groupIds = new Set(groups.map((group) => group.id))
