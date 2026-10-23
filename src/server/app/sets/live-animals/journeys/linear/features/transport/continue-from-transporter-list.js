import * as kit from '../../../../../../shared/kit.js'
import { transportersPage } from './page.js'

export const continueFromTransporterList = async (request, h, scope) =>
  h.redirect(await kit.nextTarget(request, transportersPage, scope))
