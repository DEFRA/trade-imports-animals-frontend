import { getSessionValue } from '../common/helpers/session-helpers.js'

const PAGE_TITLE = 'Transporter'
const VIEW = 'transporter/index'

export const transporterController = {
  get: {
    handler(_request, h) {
      const referenceNumber = getSessionValue(_request, 'referenceNumber')

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        referenceNumber
      })
    }
  },
  post: {
    async handler(_request, h) {
      // TODO: redirect to the intended next journey step once route is finalised.
      return h.redirect('/transporter')
    }
  }
}
