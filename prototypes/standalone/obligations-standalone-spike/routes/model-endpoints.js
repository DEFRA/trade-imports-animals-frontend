import { modelJson } from '../contract/index.js'
import { BASE } from '../journey/index.js'

/**
 * Interrogation Level 3 (TOOL-23): auth-free GETs serving the two model
 * files VERBATIM — the raw committed JSON text, never re-serialised — so
 * any tool can ask "what does this journey oblige?" without a session.
 * Levels 2 and 4 are deferred per the TOOL-25 sequencing.
 */
export function modelEndpointRoutes() {
  const { obligations, flow } = modelJson()
  const open = { auth: false }
  const serve = (body) => (_request, h) =>
    h.response(body).type('application/json')
  return [
    {
      method: 'GET',
      path: `${BASE}/model/obligations.json`,
      options: open,
      handler: serve(obligations)
    },
    {
      method: 'GET',
      path: `${BASE}/model/flow.json`,
      options: open,
      handler: serve(flow)
    }
  ]
}
