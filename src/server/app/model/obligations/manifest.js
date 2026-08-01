import { currentSetId, setKeyed } from '../../services/set-context/index.js'

const store = setKeyed('obligation set')

export const configureObligationSet = (setId, obligationSet) => {
  store.configure(setId, obligationSet)
}

export const obligationSet = () => store.current()

export const obligations = () => store.current().obligations

export const groups = () => store.current().groups

export const policy = () => {
  let setId
  try {
    setId = currentSetId()
  } catch {
    return {}
  }
  return store.has(setId) ? (store.current().policy ?? {}) : {}
}

export const obligationByName = (name) =>
  obligations().find((obligation) => obligation.name === name)
