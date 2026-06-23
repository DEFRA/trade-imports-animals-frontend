import { test, expect } from '@playwright/test'
import * as j from './journey.js'

const heading = (page, name) =>
  expect(page.getByRole('heading', { name })).toBeVisible()
const click = (page, name) => page.getByRole('button', { name }).click()
const task = (page, name) => page.getByRole('link', { name }).click()

test('task list journey — start to confirmation', async ({ page }) => {
  await page.goto('/prototype/task-list')
  await click(page, 'Start now')
  await heading(page, 'Get a car insurance quote')

  await task(page, 'About you')
  await j.fillAboutYou(page)
  await click(page, j.SAVE)

  await task(page, 'Your vehicle')
  await j.fillVehicle(page)
  await click(page, j.SAVE)

  await task(page, 'Driving history')
  await j.fillDriving(page, { hadClaims: true })
  await click(page, j.SAVE)

  // The conditional claims task only appears once claims are declared.
  await task(page, 'Your claims')
  await j.addOneClaim(page)
  await click(page, j.CONTINUE)

  await task(page, 'Choose your cover')
  await j.fillCoverType(page)
  await click(page, j.SAVE)

  await task(page, 'Optional extras')
  await j.fillExtras(page)
  await click(page, j.SAVE)

  await task(page, 'Add to your policy')
  await j.selectAddons(page)
  await click(page, j.CONTINUE)

  // Each selected add-on is its own task.
  await task(page, 'Add a named driver')
  await j.fillNamedDriverWho(page)
  await click(page, j.SAVE)
  await j.pickRelationship(page)
  await click(page, j.SAVE)

  await task(page, 'Declare vehicle modifications')
  await j.fillModificationsDescribe(page)
  await click(page, j.SAVE)
  await j.fillModificationsValue(page)
  await click(page, j.SAVE)

  await task(page, 'Get your quote')
  await heading(page, 'Your quote')
  await click(page, 'Accept and continue')
  await click(page, 'Accept and get quote')
  await heading(page, 'Quote confirmed')
})
