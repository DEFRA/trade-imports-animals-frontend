import { buildNavigation } from './build-navigation.js'

function mockRequest(options) {
  return { ...options }
}

describe('#buildNavigation', () => {
  test('Should rename Home to Dashboard pointing at the root', () => {
    const navigation = buildNavigation(mockRequest({ path: '/non-existent' }))

    expect(navigation).toContainEqual({
      current: false,
      text: 'Dashboard',
      href: '/'
    })
    expect(navigation.map((item) => item.text)).not.toContain('Home')
  })

  test('Should add an Address book item pointing at /address-book', () => {
    const navigation = buildNavigation(mockRequest({ path: '/non-existent' }))

    expect(navigation).toContainEqual({
      current: false,
      text: 'Address book',
      href: '/address-book'
    })
  })

  test('Should mark Dashboard active only on the root path', () => {
    const navigation = buildNavigation(mockRequest({ path: '/' }))

    const dashboard = navigation.find((item) => item.text === 'Dashboard')
    const addressBook = navigation.find((item) => item.text === 'Address book')

    expect(dashboard.current).toBe(true)
    expect(addressBook.current).toBe(false)
  })

  test('Should mark Address book active on any /address-book sub-path', () => {
    const navigation = buildNavigation(
      mockRequest({ path: '/address-book/123/edit' })
    )

    const dashboard = navigation.find((item) => item.text === 'Dashboard')
    const addressBook = navigation.find((item) => item.text === 'Address book')

    expect(addressBook.current).toBe(true)
    expect(dashboard.current).toBe(false)
  })

  test('Should not render Manage account or Log out stub items', () => {
    const texts = buildNavigation(mockRequest({ path: '/' })).map(
      (item) => item.text
    )

    expect(texts).not.toContain('Manage account')
    expect(texts).not.toContain('Log out')
  })
})
