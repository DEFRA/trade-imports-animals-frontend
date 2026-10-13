/**
 * Signs in via the stub-auth route (see server/auth/stub-sign-in.js) - no
 * real Defra ID stub involved, only reachable when STUB_MODE=true.
 *
 * `contactId` signs in as that user instead of the default.
 */
export async function signIn(
  page,
  { organisationId = 'stub-org-1', contactId } = {}
) {
  const query = new URLSearchParams({
    organisationId,
    ...(contactId && { contactId })
  })
  await page.goto(`/auth/stub-sign-in?${query}`)
}
