import { config } from '../../../config/config.js'

export const isAuthStubMode = () =>
  config.get('auth.stubMode') && !config.get('isProduction')
