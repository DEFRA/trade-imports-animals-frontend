import { test, expect } from '@playwright/test'
import * as j from './journey.js'

const heading = (page, name) =>
  expect(page.getByRole('heading', { name })).toBeVisible()
const click = (page, name) => page.getByRole('button', { name }).click()
const task = (page, name) => page.getByRole('link', { name }).click()

test('task list with linear tasks — start to confirmation', async ({
  page
}) => {
  await page.goto('/prototype/task-list-with-linear-tasks')
  await click(page, 'Start now')
  await heading(page, 'Get a car insurance quote')

  // Task 1 is a short linear run of two sections, then back to the hub.
  await task(page, 'About you and your vehicle')
  await heading(page, 'About you')
  await j.fillAboutYou(page)
  await click(page, j.SAVE)
  await heading(page, 'Your vehicle')
  await j.fillVehicle(page)
  await click(page, j.SAVE)

  // Task 2 runs driving history, the claims loop, cover and extras.
  await task(page, 'Your driving and cover')
  await heading(page, 'Driving history')
  await j.fillDriving(page, { hadClaims: true })
  await click(page, j.SAVE)
  await heading(page, 'Claims you have added')
  await j.addOneClaim(page)
  await click(page, j.CONTINUE)
  await heading(page, 'Choose your cover')
  await j.fillCoverType(page)
  await click(page, j.SAVE)
  await heading(page, 'Optional extras')
  await j.fillExtras(page)
  await click(page, j.SAVE)

  await task(page, 'Add to your policy')
  await j.selectAddons(page)
  await click(page, j.CONTINUE)

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
