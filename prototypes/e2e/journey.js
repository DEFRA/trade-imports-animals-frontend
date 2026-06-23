/**
 * Shared helpers for the prototype demo specs. Each `fill*` fills the fields on
 * the page it is given (it does not submit); the spec drives navigation so the
 * same helpers work for the linear and task-list shaped journeys.
 */

export async function fillAboutYou(page) {
  await page.getByLabel('Full name').fill('Alex Driver')
  await page.getByLabel('Email address').fill('alex@example.com')
  await page.getByLabel('UK telephone number').fill('07700 900123')
  await page.getByLabel('Postcode').fill('SW1A 1AA')
  await page.getByLabel('Country of residence').selectOption('england')
  await page.getByLabel('Day').fill('27')
  await page.getByLabel('Month').fill('3')
  await page.getByLabel('Year').fill('1985')
}

export async function fillVehicle(page) {
  await page.getByLabel('Registration number').fill('AB12 CDE')
  await page.getByLabel('Make').fill('Ford')
  await page.getByLabel('Model').fill('Focus')
  await page.getByLabel('Year of manufacture').fill('2018')
  await page.getByLabel('Estimated value').fill('8000')
}

export async function fillDriving(page, { hadClaims }) {
  await page.getByLabel('Years of no-claims discount').fill('5')
  await page.getByLabel(hadClaims ? 'Yes' : 'No').check()
  await page.getByLabel('Penalty points').fill('0')
}

export async function addOneClaim(page) {
  // From the claims manage list: add a single claim, returning to the list.
  await page
    .getByRole('button', { name: /Add a claim|Add another claim/ })
    .click()
  await page.getByLabel('Accident').check()
  await page.getByLabel('Approximate claim amount').fill('500')
  await page.getByRole('button', { name: 'Add claim' }).click()
}

export async function fillCoverType(page) {
  await page.getByLabel('Comprehensive').check()
  await page.getByLabel('Yes').check() // voluntary excess conditional reveal
  await page.getByLabel('Voluntary excess amount').fill('250')
}

export async function fillExtras(page) {
  await page.getByLabel('Breakdown cover').check()
  await page.getByLabel('Courtesy car').check()
}

export async function selectAddons(page) {
  await page.getByLabel('Add a named driver').check()
  await page.getByLabel('Declare vehicle modifications').check()
}

export async function fillNamedDriverWho(page) {
  await page.getByLabel('Full name').fill('Sam Passenger')
  await page.getByLabel('Day').fill('1')
  await page.getByLabel('Month').fill('1')
  await page.getByLabel('Year').fill('1990')
}

export async function pickRelationship(page) {
  await page.getByLabel('Spouse or partner').check()
}

export async function fillModificationsDescribe(page) {
  await page.getByLabel('Describe the modifications').fill('Alloy wheels')
}

export async function fillModificationsValue(page) {
  await page.getByLabel('Approximate value added').fill('600')
}

export const SAVE = 'Save and continue'
export const CONTINUE = 'Continue'
