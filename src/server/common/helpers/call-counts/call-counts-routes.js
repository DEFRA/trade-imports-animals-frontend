import { statusCodes } from '../../constants/status-codes.js'
import { callCountTotals, clearCallCountTotals } from './call-count-totals.js'

// A load generator reads and clears these totals, with no session to present
const routeOptions = {
  auth: false,
  plugins: { crumb: false, yar: { skip: true } }
}

export const callCountsRoutes = {
  plugin: {
    name: 'call-counts-routes',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/call-counts',
          options: routeOptions,
          handler: (_request, h) => h.response(callCountTotals())
        },
        {
          method: 'DELETE',
          path: '/call-counts',
          options: routeOptions,
          handler: (_request, h) => {
            clearCallCountTotals()
            return h.response().code(statusCodes.noContent)
          }
        }
      ])
    }
  }
}
