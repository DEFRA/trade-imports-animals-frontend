export const DEFRA_ID_CALLS = Object.freeze({
  openidConfiguration: {
    dependency: 'defra-id',
    operation: 'openid-configuration'
  },
  jwks: { dependency: 'defra-id', operation: 'jwks', interfaceId: 'SYN-12' },
  tokenExchange: {
    dependency: 'defra-id',
    operation: 'token-exchange',
    interfaceId: 'SYN-11'
  },
  tokenRefresh: {
    dependency: 'defra-id',
    operation: 'token-refresh',
    interfaceId: 'SYN-13'
  }
})
