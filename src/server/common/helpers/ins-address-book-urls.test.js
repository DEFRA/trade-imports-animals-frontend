import { useInsFrontendBaseUrl } from '../test-helpers/use-ins-frontend-base-url.js'
import {
  insAddAddressUrl,
  insAddressBookUrl,
  insViewAddressUrl,
  insViewTransporterUrl
} from './ins-address-book-urls.js'

describe('INS address book URLs', () => {
  const setInsFrontendBaseUrl = useInsFrontendBaseUrl()

  it('builds the address book URL on the INS frontend', () => {
    setInsFrontendBaseUrl('http://ins.example/')

    expect(insAddressBookUrl()).toBe('http://ins.example/address-book')
  })

  it('builds the add-address URL carrying its query', () => {
    setInsFrontendBaseUrl('http://ins.example')

    expect(
      insAddAddressUrl({ 'journey-type': 'gbn-ag', 'notification-id': 'n 1' })
    ).toBe(
      'http://ins.example/address-book/add?journey-type=gbn-ag&notification-id=n+1'
    )
  })

  it('builds the view-address URL with an encoded id and its return path', () => {
    setInsFrontendBaseUrl('http://ins.example')

    expect(insViewAddressUrl('a/b', '/picker?q=x&page=1')).toBe(
      'http://ins.example/address-book/a%2Fb?return=%2Fpicker%3Fq%3Dx%26page%3D1'
    )
  })

  it('builds the view-transporter URL with an encoded id and its return path', () => {
    setInsFrontendBaseUrl('http://ins.example/')

    expect(insViewTransporterUrl('t/1', '/transporters?q=x')).toBe(
      'http://ins.example/address-book/transporter/t%2F1?return=%2Ftransporters%3Fq%3Dx'
    )
  })
})
