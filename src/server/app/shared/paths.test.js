import { describe, expect, it } from 'vitest'

import * as paths from './paths.js'
import { registerSetMount, withSetContext } from './set-context.js'

const SET_ID = 'live-animals'

registerSetMount(SET_ID, '/live-animals')
registerSetMount('plant-products', '/plant-products')

describe('set-aware paths', () => {
  it.each([
    [SET_ID, '/live-animals'],
    ['plant-products', '/plant-products']
  ])('builds links for %s in the same process', (setId, base) => {
    withSetContext(setId, () => {
      expect(paths.setBase()).toBe(base)
      expect(paths.pagePath('J', 'slug')).toBe(`${base}/notifications/J/slug`)
      expect(paths.hubPath('J')).toBe(`${base}/notifications/J`)
      expect(paths.createPath()).toBe(`${base}/notifications`)
      expect(paths.dashboardPath()).toBe(base)
      expect(paths.breadcrumbs('J', 'Page title')).toEqual([
        { text: 'Your notifications', href: base },
        { text: 'Page title' }
      ])
    })
  })

  it.each([SET_ID, 'plant-products'])(
    'keeps route shapes prefix-free under %s',
    (setId) => {
      withSetContext(setId, () => {
        expect(paths.pageRoutePath('x')).toBe('/notifications/{journeyId}/x')
        expect(paths.hubRoutePath()).toBe('/notifications/{journeyId}')
        expect(paths.dashboardRoutePath()).toBe('/')
        expect(paths.createRoutePath()).toBe('/notifications')
      })
    }
  )

  it('does not export the removed module-load base', () => {
    expect(paths.BASE).toBeUndefined()
  })
})
