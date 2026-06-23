import { test, expect } from '@playwright/test'
import * as j from './journey.js'

const heading = (page, name) =>
  expect(page.getByRole('heading', { name })).toBeVisible()
const click = (page, name) => page.getByRole('button', { name }).click()

test('linear journey — start to confirmation', async ({ page }) => {
  await page.goto('/prototype/linear')
  await click(page, 'Start now')

  await heading(page, 'About you')
  await j.fillAboutYou(page)
  await click(page, j.SAVE)

  await heading(page, 'Your vehicle')
  await j.fillVehicle(page)
  await click(page, j.SAVE)

  await heading(page, 'Driving history')
  await j.fillDriving(page, { hadClaims: true })
  await click(page, j.SAVE)

  // Conditional sub-loop: add a claim, then continue out of the loop.
  await heading(page, 'Claims you have added')
  await j.addOneClaim(page)
  await heading(page, 'Claims you have added')
  await click(page, j.CONTINUE)

  await heading(page, 'Choose your cover')
  await j.fillCoverType(page)
  await click(page, j.SAVE)

  await heading(page, 'Optional extras')
  await j.fillExtras(page)
  await click(page, j.SAVE)

  // Per-option subtask fan-out.
  await heading(page, 'Add to your policy')
  await j.selectAddons(page)
  await click(page, j.CONTINUE)

  await heading(page, 'Named driver')
  await j.fillNamedDriverWho(page)
  await click(page, j.SAVE)

  await heading(page, 'Relationship to you')
  await j.pickRelationship(page)
  await click(page, j.SAVE)

  await heading(page, 'Describe the modifications')
  await j.fillModificationsDescribe(page)
  await click(page, j.SAVE)

  await heading(page, 'Value of the modifications')
  await j.fillModificationsValue(page)
  await click(page, j.SAVE)

  await heading(page, 'Your quote')
  await click(page, 'Accept and continue')

  await heading(page, 'Check your answers')
  await click(page, 'Accept and get quote')

  await heading(page, 'Quote confirmed')
})
