import { config } from '../../../config/config.js'
import { restoreConfigAfterEach } from '../test-helpers/restore-config-after-each.js'
import { buildInsFrontendUrl } from './frontend-url.js'

const INS_FRONTEND_BASE_URL_KEY = 'tradeImportsInsFrontend.baseUrl'

describe('buildInsFrontendUrl', () => {
  restoreConfigAfterEach([INS_FRONTEND_BASE_URL_KEY])

  it('joins the path to a base URL with no trailing slash', () => {
    config.set(INS_FRONTEND_BASE_URL_KEY, 'http://ins.example')

    expect(buildInsFrontendUrl('/notification-type')).toBe(
      'http://ins.example/notification-type'
    )
  })

  it('joins the path to a base URL with a trailing slash without doubling it', () => {
    config.set(INS_FRONTEND_BASE_URL_KEY, 'http://ins.example/')

    expect(buildInsFrontendUrl('/notification-type')).toBe(
      'http://ins.example/notification-type'
    )
  })
})
