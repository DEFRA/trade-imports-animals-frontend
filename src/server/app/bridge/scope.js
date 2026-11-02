import { obligationByName, obligations } from '../model/obligations/manifest.js'
import { ancestorChain, isGroup } from '../model/obligations/manifest-graph.js'
import { fulfilmentIndexToPath } from './fulfilments/index.js'
import { pathKey } from '../lib/path.js'
import { isAnswered } from '../lib/answered.js'
import { computeReadyForCheckYourAnswers } from './readiness-config.js'
import { flowOnlyKeys } from './flow-only-keys.js'

const collectInstanceValues = (answers, chain, name) => {
  const values = []
  const visit = (node, remainingGroups) => {
    if (remainingGroups.length === 0) {
      values.push(node?.[name])
      return
    }
    const [group, ...rest] = remainingGroups
    const items = node?.[group.name]
    if (!Array.isArray(items)) {
      return
    }
    for (const item of items) {
      visit(item, rest)
    }
  }
  visit(answers, chain)
  return values
}

const anyInstanceAnswered = (answers, id) => {
  const obligation = obligationByName(id)
  if (!obligation) {
    return false
  }
  return collectInstanceValues(answers, ancestorChain(obligation), id).some(
    isAnswered
  )
}

const groupNodeKey = (inScope, name) => {
  inScope.add(name)
}

const groupInstanceKeys = (inScope, implications, obligation, chain, name) => {
  const parentFulfilmentIndexes =
    implications[obligation.within.id]?.fulfilmentIndexes ?? []
  for (const fulfilmentIndex of parentFulfilmentIndexes) {
    inScope.add(pathKey(fulfilmentIndexToPath(chain, fulfilmentIndex, name)))
  }
}

const leafFulfilmentIndexKeys = (inScope, chain, name, fulfilmentIndexes) => {
  for (const fulfilmentIndex of fulfilmentIndexes) {
    inScope.add(pathKey(fulfilmentIndexToPath(chain, fulfilmentIndex, name)))
  }
}

const leafScalarKey = (inScope, name) => {
  inScope.add(name)
}

const addProjectedKeys = (inScope, implications, obligation) => {
  const name = obligation.name
  const chain = ancestorChain(obligation)

  if (isGroup(obligation)) {
    if (chain.length === 0) {
      return groupNodeKey(inScope, name)
    }
    return groupInstanceKeys(inScope, implications, obligation, chain, name)
  }

  const implication = implications[obligation.id]
  return Array.isArray(implication.fulfilmentIndexes)
    ? leafFulfilmentIndexKeys(
        inScope,
        chain,
        name,
        implication.fulfilmentIndexes
      )
    : leafScalarKey(inScope, name)
}

const projectInScope = (implications) => {
  const inScope = new Set()
  for (const obligation of obligations()) {
    if (implications[obligation.id]?.inScope) {
      addProjectedKeys(inScope, implications, obligation)
    }
  }
  return inScope
}

/**
 * The evaluator's in-scope obligations as path keys, without the flow-only keys.
 *
 * @param {object} evaluation - the request-level evaluator result.
 * @returns {Set<string>} one path key per in-scope node.
 */
export const rawInScope = (evaluation) => projectInScope(evaluation.obligations)

const addFlowOnlyKeys = (inScope) => {
  for (const id of flowOnlyKeys()) {
    inScope.add(id)
  }
}

/**
 * The scope for one request: the in-scope path keys with the flow-only keys
 * added, and whether the notification is ready for check your answers.
 *
 * @param {object} evaluation - the request-level evaluator result.
 * @param {object} answers - the nested answer POJO.
 * @returns {{ inScope: Set<string>, has: (id: string) => boolean,
 *   answered: (id: string) => boolean, readyForCheckYourAnswers: boolean }}
 */
export const makeScopeFromEvaluation = (evaluation, answers) => {
  const inScope = rawInScope(evaluation)
  addFlowOnlyKeys(inScope)
  return {
    inScope,
    has: (id) => inScope.has(id),
    answered: (id) => anyInstanceAnswered(answers, id),
    readyForCheckYourAnswers: computeReadyForCheckYourAnswers(
      answers,
      inScope,
      evaluation
    )
  }
}
