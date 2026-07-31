import { assembleRequestView } from '../../request-view.js'

export const viewWithFlowOnlyAnswers = (
  view,
  flowOnlyAnswers,
  evaluation = view.evaluation
) => {
  const assembled = assembleRequestView(
    view.fulfilment,
    evaluation,
    flowOnlyAnswers
  )
  return { ...view, ...assembled, flowOnlyAnswers }
}
