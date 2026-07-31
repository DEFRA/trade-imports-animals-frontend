import { get } from '../read.js'
import { splitPatch } from './pipeline/split.js'
import { currentViewAfterCanonicalPatch } from './pipeline/canonical.js'
import { persistFlowOnlyPatch } from './pipeline/flow-only.js'

export const commit = async (request, h, patch) => {
  const current = await get(request, h)
  const { canonical, flowOnly } = splitPatch(patch)
  const canonicalView = await currentViewAfterCanonicalPatch(
    request,
    current,
    canonical,
    'commit'
  )
  const view = await persistFlowOnlyPatch(request, h, canonicalView, flowOnly)
  return { answers: view.answers, scope: view.scope }
}
