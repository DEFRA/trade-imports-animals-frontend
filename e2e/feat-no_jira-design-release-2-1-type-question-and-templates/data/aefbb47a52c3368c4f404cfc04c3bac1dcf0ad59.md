# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: animals/e2e/features/address-book/address-book-navigation.spec.ts >> Address book navigation between services >> follows the Address book item from the animals journey to the INS address book and back
- Location: tests/animals/e2e/features/address-book/address-book-navigation.spec.ts:6:3

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: locator.click: Test timeout of 90000ms exceeded.
Call log:
  - waiting for locator('a[href^="http://localhost:3000"]').first()

```

# Page snapshot

```yaml
- generic [active] [ref=f3e1]:
  - link "Skip to main content" [ref=f3e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f3e3]:
    - link [ref=f3e7] [cursor=pointer]:
      - /url: https://www.gov.uk/
      - img "GOV.UK" [ref=f3e8]
    - region "Service information" [ref=f3e21]:
      - generic [ref=f3e23]:
        - link "Import notification service" [ref=f3e25] [cursor=pointer]:
          - /url: /
        - navigation "Menu" [ref=f3e26]:
          - list [ref=f3e27]:
            - listitem [ref=f3e28]:
              - link [ref=f3e29] [cursor=pointer]:
                - /url: /
                - strong [ref=f3e30]: Dashboard
            - listitem [ref=f3e31]:
              - link "Address book" [ref=f3e32] [cursor=pointer]:
                - /url: /address-book
            - listitem [ref=f3e33]:
              - link "Manage account" [ref=f3e34] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=f3e35]:
              - link "Log out" [ref=f3e36] [cursor=pointer]:
                - /url: /auth/sign-out
  - generic [ref=f3e37]:
    - paragraph [ref=f3e39]:
      - strong [ref=f3e40]: Alpha
      - generic [ref=f3e41]:
        - text: This is a new service. Help us improve it and
        - link "give your feedback by email" [ref=f3e42] [cursor=pointer]:
          - /url: mailto:APHAServiceDesk@apha.gov.uk
        - text: .
    - main [ref=f3e43]:
      - generic [ref=f3e45]:
        - heading "Dashboard" [level=1] [ref=f3e46]
        - button "Start a new notification" [ref=f3e47] [cursor=pointer]
        - generic [ref=f3e48]:
          - generic [ref=f3e49]:
            - generic [ref=f3e50]: Search by notification reference
            - searchbox "Search by notification reference" [ref=f3e51]
          - button "Search" [ref=f3e52] [cursor=pointer]
        - paragraph [ref=f3e53]: There are no notifications yet.
  - contentinfo [ref=f3e54]:
    - generic [ref=f3e67]:
      - generic [ref=f3e68]:
        - heading "Support links" [level=2] [ref=f3e69]
        - list [ref=f3e70]:
          - listitem [ref=f3e71]:
            - link "Privacy" [ref=f3e72] [cursor=pointer]:
              - /url: https://www.gov.uk/help/privacy-notice
          - listitem [ref=f3e73]:
            - link "Cookies" [ref=f3e74] [cursor=pointer]:
              - /url: https://www.gov.uk/help/cookies
          - listitem [ref=f3e75]:
            - link "Accessibility statement" [ref=f3e76] [cursor=pointer]:
              - /url: https://www.gov.uk/help/accessibility-statement
        - generic [ref=f3e79]:
          - text: All content is available under the
          - link "Open Government Licence v3.0" [ref=f3e80] [cursor=pointer]:
            - /url: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
          - text: ", except where otherwise stated"
      - link "© Crown copyright" [ref=f3e82] [cursor=pointer]:
        - /url: https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright/
```

# Test source

```ts
  1  | import { test, expect } from '@fixtures';
  2  | import { requireBaseUrl } from '@page-objects/shared/base-page';
  3  | import { SET_BASES } from '@page-objects/shared/sets';
  4  | 
  5  | test.describe('Address book navigation between services', { tag: ['@compose', '@integration'] }, () => {
  6  |   test('follows the Address book item from the animals journey to the INS address book and back', async ({
  7  |     pages,
  8  |     animalsPages,
  9  |     insPages,
  10 |   }) => {
  11 |     test.slow();
  12 | 
  13 |     const animalsBaseUrl = requireBaseUrl('TRADE_IMPORTS_ANIMALS_FRONTEND_BASE_URL');
  14 |     const animalsOrigin = new URL(animalsBaseUrl).origin;
  15 |     const insOrigin = new URL(requireBaseUrl('TRADE_IMPORTS_INS_FRONTEND_BASE_URL')).origin;
  16 | 
  17 |     await animalsPages.dashboard.open();
  18 | 
  19 |     await Promise.all([pages.page.waitForURL((url) => url.origin !== animalsOrigin), animalsPages.dashboard.linkAddressBook.click()]);
  20 |     await insPages.addressBookList.completeSignInIfRequested();
  21 | 
  22 |     await expect(pages.page).toHaveURL((url) => url.origin === insOrigin && url.pathname === '/address-book');
  23 |     await expect(insPages.addressBookList.heading).toBeVisible();
  24 | 
  25 |     await insPages.addressBookList.linkDashboard.click();
  26 |     await expect(insPages.dashboard.heading).toBeVisible();
> 27 |     await pages.page.locator(`a[href^="${animalsBaseUrl}"]`).first().click();
     |                                                                      ^ Error: locator.click: Test timeout of 90000ms exceeded.
  28 | 
  29 |     await expect(pages.page).toHaveURL((url) => url.origin === animalsOrigin && url.pathname.startsWith(SET_BASES.liveAnimals));
  30 |   });
  31 | });
  32 | 
```