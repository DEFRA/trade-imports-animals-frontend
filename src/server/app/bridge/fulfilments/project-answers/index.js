import { obligations } from '../../../model/obligations/manifest.js'
import { isGroup } from '../../../model/obligations/manifest-graph.js'
import { answersWithRecords, answersWithScalar } from './assemble.js'
import { projectionsOf } from './projections.js'

const withObligationAnswer = (
  answers,
  fulfilments,
  projections,
  obligation
) => {
  if (isGroup(obligation)) {
    return answers
  }
  const stored = fulfilments?.[obligation.id]
  if (stored === undefined) {
    return answers
  }
  if (!obligation.within) {
    return answersWithScalar(answers, obligation.name, stored)
  }
  const { chain, records } = projections.get(obligation)
  return answersWithRecords(
    answers,
    chain,
    obligation.name,
    records.map(({ fulfilmentIndex, value }) => [fulfilmentIndex, value])
  )
}

/**
 * Project the model `fulfilments` into the request-local page `answers`.
 *
 * The request-local page projection of canonical fulfilments. The animal
 * count comes back as the number the model stores, not the page's original
 * string.
 *
 * @param {object} [fulfilments={}] - the flat, UUID-keyed fulfilments map.
 * @returns {object} the nested answer POJO.
 */
export const projectAnswers = (fulfilments = {}) => {
  const projections = projectionsOf(fulfilments)
  return obligations().reduce(
    (answers, obligation) =>
      withObligationAnswer(answers, fulfilments, projections, obligation),
    {}
  )
}
