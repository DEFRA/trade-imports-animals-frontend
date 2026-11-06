import { config } from '../../../config/config.js'

export const STACK_DEFRA_ID_REWRITE_KEYS = [
  'defraId.browserFacingHostnameRewrite.enabled',
  'defraId.browserFacingHostnameRewrite.from',
  'defraId.browserFacingHostnameRewrite.to'
]

export const setStackDefraIdRewrite = () => {
  config.set('defraId.browserFacingHostnameRewrite.enabled', true)
  config.set('defraId.browserFacingHostnameRewrite.from', [
    'host.docker.internal',
    'trade-imports-defra-id-stub'
  ])
  config.set('defraId.browserFacingHostnameRewrite.to', 'localhost')
}
