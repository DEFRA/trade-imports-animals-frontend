import { describe, expect, it } from 'vitest'
import { CYA_SLUG } from '../../../../../../../shared/kit.js'

import {
  OPEN_SESSION_KEY,
  RETURNED_HANDLE_QUERY,
  carriedCorrelationId,
  documentsPageHref,
  newCorrelationId,
  returnPath,
  returnedCorrelationId
} from './upload-session.js'

const JOURNEY_ID = 'GBN-AG-26-000001'
const HANDLE = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'
const PAGE_PATH = `/live-animals/notifications/${JOURNEY_ID}/accompanying-documents`

const request = (query = {}) => ({ query })
const fromReview = () => request({ from: CYA_SLUG })

describe('#newCorrelationId', () => {
  it('Should mint a handle of the shape the returning request is recognised by', () => {
    const minted = newCorrelationId()

    expect(
      returnedCorrelationId(request({ [RETURNED_HANDLE_QUERY]: minted }))
    ).toBe(minted)
  })
})

describe('#returnPath', () => {
  it('Should return the browser to the documents page carrying the handle', () => {
    expect(returnPath(request(), JOURNEY_ID, HANDLE)).toBe(
      `${PAGE_PATH}?${RETURNED_HANDLE_QUERY}=${HANDLE}`
    )
  })

  it('Should keep the trail and add the handle to it', () => {
    expect(returnPath(fromReview(), JOURNEY_ID, HANDLE)).toBe(
      `${PAGE_PATH}?from=${CYA_SLUG}&${RETURNED_HANDLE_QUERY}=${HANDLE}`
    )
  })

  it('Should return a relative path, which is all the upload service accepts', () => {
    expect(returnPath(request(), JOURNEY_ID, HANDLE)).toMatch(/^\//)
    expect(returnPath(fromReview(), JOURNEY_ID, HANDLE)).toMatch(/^\//)
  })
})

describe('#documentsPageHref', () => {
  it('Should answer the page path, carrying the trail when the request carries one', () => {
    expect(documentsPageHref(request(), JOURNEY_ID)).toBe(PAGE_PATH)
    expect(documentsPageHref(fromReview(), JOURNEY_ID)).toBe(
      `${PAGE_PATH}?from=${CYA_SLUG}`
    )
  })
})

describe('#returnedCorrelationId', () => {
  it('Should answer the handle when the query carries one of the minted shape', () => {
    expect(
      returnedCorrelationId(request({ [RETURNED_HANDLE_QUERY]: HANDLE }))
    ).toBe(HANDLE)
  })

  /**
   * The handle arrives from the browser, so anything that is not the shape this module mints is
   * no handle at all — a separator or a dot segment would otherwise reach a backend URL path.
   */
  it.each([
    ['a path traversal', '../../actuator/health'],
    ['an encoded traversal', '..%2F..%2Fnotifications%2Fx'],
    ['a bare segment', 'notifications'],
    ['an empty value', ''],
    ['a handle with a separator appended', `${HANDLE}/x`]
  ])('Should answer nothing for %s', (_name, value) => {
    expect(
      returnedCorrelationId(request({ [RETURNED_HANDLE_QUERY]: value }))
    ).toBeUndefined()
  })

  it('Should answer nothing when the query carries no handle at all', () => {
    expect(returnedCorrelationId(request())).toBeUndefined()
    expect(returnedCorrelationId({})).toBeUndefined()
  })
})

describe('#carriedCorrelationId', () => {
  const posting = (payload) => ({ payload, query: {} })

  it('Should answer the handle the refresh link carries', () => {
    expect(carriedCorrelationId(request({ [OPEN_SESSION_KEY]: HANDLE }))).toBe(
      HANDLE
    )
  })

  it('Should answer the handle the form carries', () => {
    expect(carriedCorrelationId(posting({ [OPEN_SESSION_KEY]: HANDLE }))).toBe(
      HANDLE
    )
  })

  /** The handle arrives from the browser, as the returning one does, and is judged the same way. */
  it.each([
    ['a path traversal', '../../actuator/health'],
    ['an encoded traversal', '..%2F..%2Fnotifications%2Fx'],
    ['an empty value', '']
  ])('Should answer nothing for %s', (_name, value) => {
    expect(
      carriedCorrelationId(request({ [OPEN_SESSION_KEY]: value }))
    ).toBeUndefined()
    expect(
      carriedCorrelationId(posting({ [OPEN_SESSION_KEY]: value }))
    ).toBeUndefined()
  })

  it('Should answer nothing when the request carries no open session', () => {
    expect(carriedCorrelationId(request())).toBeUndefined()
    expect(carriedCorrelationId({})).toBeUndefined()
  })
})
