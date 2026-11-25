import { backendCallsOf } from '../call-counts/call-count-totals.js'
import { COUNT, publishMetricsInBackground } from './publish-metrics.js'

/**
 * Publishes one finished page request's counts, `page.request.backend.calls`
 * and `page.request.session.resolutions`, tagged `request.kind` `page`, without
 * making the request wait for the publish.
 *
 * @param {ReturnType<typeof import('../call-counts/call-counts.js').newCallCounts>} counts - what the request made
 */
export const recordPageRequestInBackground = (counts) =>
  publishMetricsInBackground({ 'request.kind': 'page' }, [
    {
      name: 'page.request.backend.calls',
      value: backendCallsOf(counts),
      unit: COUNT
    },
    {
      name: 'page.request.session.resolutions',
      value: counts.sessionResolutions,
      unit: COUNT
    }
  ])
