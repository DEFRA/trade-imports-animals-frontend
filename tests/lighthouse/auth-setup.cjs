// Logs in via the Defra ID stub before each Lighthouse audit.
// The stub form uses name="crn" / name="password"; with a single-org user
// (2100010101) the stub auto-selects the org and redirects back to the frontend.
module.exports = async (browser, { url }) => {
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded' })

  const crnInput = await page
    .waitForSelector('input[name="crn"]', { visible: true, timeout: 10000 })
    .catch(() => null)

  if (crnInput) {
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
