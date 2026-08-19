/**
 * Signs in via the stub-auth route (see server/auth/stub-sign-in.js) - no
 * real Defra ID stub involved, only reachable when STUB_MODE=true.
 */
export async function signIn(page, { organisationId = 'stub-org-1' } = {}) {
  await page.goto(
    `/auth/stub-sign-in?organisationId=${encodeURIComponent(organisationId)}`
  )
}
