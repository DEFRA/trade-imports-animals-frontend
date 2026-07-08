import { hubPath, pagePath } from '../../config.js'
import * as state from '../../engine/index.js'
import { open } from '../../shared/kit.js'

const handler = (request, h) => {
  state.resume(request, h)
  return h.redirect(hubPath())
}

export const routes = [
  { method: 'GET', path: pagePath('resume'), options: open, handler }
]
