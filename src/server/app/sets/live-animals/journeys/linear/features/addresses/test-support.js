import { expect } from 'vitest'

import { addedAddressBannerCookie } from '../../../../../../engine/persistence/session.js'
import { driveHandler } from '../../../../../../engine/test-support.js'
export const addedAddressBannerState = (addressName) => ({
  [addedAddressBannerCookie()]: { name: addressName }
})

const cookiesLeftBy = (requestState, { cookies, unstated }) => ({
  ...Object.fromEntries(
    Object.entries(requestState).filter(([name]) => !unstated.includes(name))
  ),
  ...cookies
})

export const expectAddedAddressBannerShownOnce = async (getHandler) => {
  const firstState = addedAddressBannerState('New Farm')
  const first = await driveHandler(getHandler, { state: firstState })
  const second = await driveHandler(getHandler, {
    journeyId: first.journeyId,
    state: cookiesLeftBy(firstState, first)
  })

  expect(first.view.context.successBanner).toEqual({
    titleText: 'Success',
    text: 'New Farm address added to your address book'
  })
  expect(first.unstated).toEqual([addedAddressBannerCookie()])
  expect(second.view.context.successBanner).toBeNull()
}
