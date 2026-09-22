import { setKeyed } from '../../services/set-context/index.js'

const store = setKeyed('Obligation set')

export const configureObligationSet = (setId, nextObligationSet) => {
  store.configure(setId, nextObligationSet)
}

export const obligationSet = () => store.current()

export const obligations = () => store.current().obligations

export const groups = () => store.current().groups

export const obligationByName = (name) =>
  obligations().find((obligation) => obligation.name === name)
