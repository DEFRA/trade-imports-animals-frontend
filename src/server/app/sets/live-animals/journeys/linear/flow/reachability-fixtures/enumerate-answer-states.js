import { enumerateScopeStates, withoutBlanks } from './scope-states.js'
import { seedVariants } from './seeds.js'

// Every prover input: each seed variant overlaid with each scope state.
export const enumerateAnswerStates = () =>
  seedVariants().flatMap(({ answers }) =>
    enumerateScopeStates().map((state) => ({
      ...answers,
      ...withoutBlanks(state)
    }))
  )
