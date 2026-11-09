import { config } from '../../../config/config.js'
import { restoreConfigAfterEach } from '../test-helpers/restore-config-after-each.js'
import { buildAnimalsFrontendUrl, buildInsFrontendUrl } from './frontend-url.js'

const INS_FRONTEND_BASE_URL_KEY = 'tradeImportsInsFrontend.baseUrl'
const ANIMALS_FRONTEND_BASE_URL_KEY = 'tradeImportsAnimalsFrontend.baseUrl'

describe('frontend-url', () => {
  restoreConfigAfterEach([
    INS_FRONTEND_BASE_URL_KEY,
    ANIMALS_FRONTEND_BASE_URL_KEY
  ])

  describe('buildInsFrontendUrl', () => {
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

  describe('buildAnimalsFrontendUrl', () => {
    it('joins the path to a base URL with no trailing slash', () => {
      config.set(ANIMALS_FRONTEND_BASE_URL_KEY, 'http://animals.example')

      expect(buildAnimalsFrontendUrl('/notifications/abc/transporters')).toBe(
        'http://animals.example/notifications/abc/transporters'
      )
    })

    it('joins the path to a base URL with a trailing slash without doubling it', () => {
      config.set(ANIMALS_FRONTEND_BASE_URL_KEY, 'http://animals.example/')

      expect(buildAnimalsFrontendUrl('/notifications/abc/transporters')).toBe(
        'http://animals.example/notifications/abc/transporters'
      )
    })
  })
})
