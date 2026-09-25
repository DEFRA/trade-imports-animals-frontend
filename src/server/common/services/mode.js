import { config } from '../../../config/config.js'

/** One switch for "run against stubs rather than the real thing", covering both
 * the data the journey reads and the way a trader signs in. There is no
 * configuration that wants one without the other: a stub run is self-contained
 * and needs neither the dependent services nor Defra ID, and a real run wants
 * both.
 *
 * Never honoured in production. Stub mode hands a session to any
 * unauthenticated caller with no identity provider involved, so flipping
 * the flag there would let anyone sign in as the stub user. */
export const isStubMode = () =>
  config.get('stubMode') && !config.get('isProduction')
