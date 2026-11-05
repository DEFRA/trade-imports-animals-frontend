import { useInsFrontendBaseUrl } from '../../app/engine/test-support.js'
import { buildInsFrontendUrl } from './ins-frontend-url.js'

describe('buildInsFrontendUrl', () => {
  const setInsFrontendBaseUrl = useInsFrontendBaseUrl()

  it('joins the path to a base URL with no trailing slash', () => {
    setInsFrontendBaseUrl('http://ins.example')

    expect(buildInsFrontendUrl('/notification-type')).toBe(
      'http://ins.example/notification-type'
    )
  })

  it('joins the path to a base URL with a trailing slash without doubling it', () => {
    setInsFrontendBaseUrl('http://ins.example/')

    expect(buildInsFrontendUrl('/notification-type')).toBe(
      'http://ins.example/notification-type'
    )
  })
})
