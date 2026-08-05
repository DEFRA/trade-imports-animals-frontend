let configuredSet

const requireConfiguredSet = () => {
  if (!configuredSet) {
    throw new Error('Obligation set has not been configured')
  }
  return configuredSet
}

export const configureObligationSet = (nextObligationSet) => {
  configuredSet = nextObligationSet
}

export const obligationSet = () => requireConfiguredSet()

export const obligations = () => requireConfiguredSet().obligations

export const groups = () => requireConfiguredSet().groups

export const obligationByName = (name) =>
  obligations().find((obligation) => obligation.name === name)
