import { obligations } from '../../model/obligations/obligations.js'

const obligationByName = new Map(
  obligations.map((obligation) => [obligation.name, obligation])
)

export const obligationFor = (name) => obligationByName.get(name)
