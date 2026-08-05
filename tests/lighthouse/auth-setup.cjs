// Logs in via the Defra ID stub before each Lighthouse audit.
// The stub form uses name="crn" / name="password"; with a single-org user
// (2100010101) the stub auto-selects the org and redirects back to the frontend.
// Sign-in is needed on the first URL only: after that the browser lands on the
// frontend rather than the stub, so waiting for the form would cost the full
// timeout on every remaining page.
const SIGN_IN_TIMEOUT_MS = 10000

const signInForm = (page, url) => {
  const onIdentityProvider = new URL(page.url()).origin !== new URL(url).origin
  if (!onIdentityProvider) {
    return page.$('input[name="crn"]')
  }
  return page
    .waitForSelector('input[name="crn"]', {
      visible: true,
      timeout: SIGN_IN_TIMEOUT_MS
    })
    .catch(() => null)
}

module.exports = async (browser, { url }) => {
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded' })

  if (await signInForm(page, url)) {
    await page.type('input[name="crn"]', '2100010101')
    await page.type(
      'input[name="password"]',
      process.env.AUTH_PASSWORD || 'Password123'
    )
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('#submit')
    ])
  }

  await page.close()
}
