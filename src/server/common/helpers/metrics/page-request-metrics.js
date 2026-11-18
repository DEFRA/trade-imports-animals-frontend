import { COUNT, publishMetricsInBackground } from './publish-metrics.js'

/**
 * Publishes one finished page request's counts, `page.request.backend.calls`
 * and `page.request.session.resolutions`, tagged `request.kind` `page`, without
 * making the request wait for the publish.
 *
 * @param {{ backendCalls: number, sessionResolutions: number }} counts - what the request made
 */
export const recordPageRequestInBackground = ({
  backendCalls,
  sessionResolutions
}) =>
  publishMetricsInBackground({ 'request.kind': 'page' }, [
    { name: 'page.request.backend.calls', value: backendCalls, unit: COUNT },
    {
      name: 'page.request.session.resolutions',
      value: sessionResolutions,
      unit: COUNT
    }
  ])
