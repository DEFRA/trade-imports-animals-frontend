import { describe, expect, it } from 'vitest'

import { amendFormActions } from './amend-form-actions.js'

const PATH = '/n/j-1/origin'

describe('#amendFormActions', () => {
  it('Should send Save and return to the real service change=1 return and Save and continue to the plain page', () => {
    expect(amendFormActions(PATH, new URLSearchParams())).toEqual({
      returnAction: `${PATH}?change=1`,
      continueAction: PATH
    })
  })

  it("Should keep the page's other query on both and drop change from Save and continue", () => {
    const actions = amendFormActions(
      PATH,
      new URLSearchParams('return=addresses&change=1')
    )

    expect(actions.returnAction).toBe(`${PATH}?return=addresses&change=1`)
    expect(actions.continueAction).toBe(`${PATH}?return=addresses`)
  })

  it('Should drop the GET-only staleAction flag from both', () => {
    const actions = amendFormActions(
      PATH,
      new URLSearchParams('staleAction=1&change=1')
    )

    expect(actions.returnAction).toBe(`${PATH}?change=1`)
    expect(actions.continueAction).toBe(PATH)
  })

  it('Should cope with no search params at all', () => {
    expect(amendFormActions(PATH, undefined)).toEqual({
      returnAction: `${PATH}?change=1`,
      continueAction: PATH
    })
  })
})
