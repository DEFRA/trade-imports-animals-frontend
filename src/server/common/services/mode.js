import { config } from '../../../config/config.js'

/** One switch for "run against stubs rather than the real thing", covering both
 * the data the journey reads and the way a trader signs in. There is no
 * configuration that wants one without the other: a stub run is self-contained
 * and needs neither the dependent services nor Defra ID, and a real run wants
 * both.
 *
 * Never honoured in production, whatever the environment says. Stub mode signs
 * its own sessions with a key committed to this repo, so obeying the flag in
 * production would let anyone able to set an environment variable mint an
 * authenticated session. */
export const isStubMode = () =>
  config.get('stubMode') && !config.get('isProduction')
