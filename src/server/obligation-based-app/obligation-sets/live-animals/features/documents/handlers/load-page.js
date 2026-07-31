import * as state from '../../../engine/index.js'
import { withScanStatus } from '../scan/status.js'
import { getAttempt } from '../view-model/refresh.js'

export const loadPage = async (request, h) => {
  const { journey, answers, scope, evaluation } = await state.get(request, h)
  const documents = await withScanStatus(
    state.collectionView(answers, ['documents'], evaluation),
    getAttempt(request) > 0
  )
  return { journey, answers, scope, evaluation, documents }
}
