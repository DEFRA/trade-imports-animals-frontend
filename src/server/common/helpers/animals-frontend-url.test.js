import { useAnimalsFrontendBaseUrl } from '../test-helpers/use-animals-frontend-base-url.js'
import { buildAnimalsFrontendUrl } from './animals-frontend-url.js'

describe('buildAnimalsFrontendUrl', () => {
  const setAnimalsFrontendBaseUrl = useAnimalsFrontendBaseUrl()

  it('joins the path to a base URL with no trailing slash', () => {
    setAnimalsFrontendBaseUrl('http://animals.example')

    expect(buildAnimalsFrontendUrl('/live-animals/notifications')).toBe(
      'http://animals.example/live-animals/notifications'
    )
  })

  it('joins the path to a base URL with a trailing slash without doubling it', () => {
    setAnimalsFrontendBaseUrl('http://animals.example/')

    expect(buildAnimalsFrontendUrl('/live-animals/notifications')).toBe(
      'http://animals.example/live-animals/notifications'
    )
  })
})
