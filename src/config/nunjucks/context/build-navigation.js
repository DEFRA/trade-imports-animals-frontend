export function buildNavigation(request) {
  const path = request?.path ?? ''

  return [
    {
      text: 'Dashboard',
      href: '/',
      current: path === '/'
    },
    {
      text: 'Address book',
      href: '/address-book',
      current: path.startsWith('/address-book')
    },
    {
      text: 'About',
      href: '/about',
      current: path === '/about'
    }
  ]
}
