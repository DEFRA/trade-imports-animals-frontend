# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/pages/contact-address.spec.ts >> Contact address page >> renders the page controls
- Location: tests/e2e/pages/contact-address.spec.ts:8:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('radio', { name: 'Animal and Plant Health Agency' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('radio', { name: 'Animal and Plant Health Agency' })

```

```yaml
- link "Skip to main content":
  - /url: "#main-content"
- banner:
  - link "GOV.UK":
    - /url: https://www.gov.uk/
    - img "GOV.UK"
  - region "Service information":
    - link "Import notification service":
      - /url: /
- text: test.user11@defra.gov.uk
- link "Sign out":
  - /url: /auth/sign-out
- navigation "Breadcrumb":
  - list:
    - listitem:
      - link "Your notifications":
        - /url: /
    - listitem: Contact address for consignment
- link "Back":
  - /url: /notifications/GBN-AG-26-46NGVR
- main:
  - strong: Draft
  - text: GBN-AG-26-46NGVR
  - group "Contact address for consignment":
    - heading "Contact address for consignment" [level=1]
    - text: Selecting a contact copies their name and address into this notification.
  - button "Save and continue"
  - button "Save and return to hub"
  - link "Cancel and return to hub":
    - /url: /notifications/GBN-AG-26-46NGVR
- contentinfo:
  - heading "Support links" [level=2]
  - list:
    - listitem:
      - link "Privacy":
        - /url: https://www.gov.uk/help/privacy-notice
    - listitem:
      - link "Cookies":
        - /url: https://www.gov.uk/help/cookies
    - listitem:
      - link "Accessibility statement":
        - /url: https://www.gov.uk/help/accessibility-statement
  - text: All content is available under the
  - link "Open Government Licence v3.0":
    - /url: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
  - text: ", except where otherwise stated"
  - link "© Crown copyright":
    - /url: https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright/
```

# Test source

```ts
  1  | import { test, expect } from '@fixtures';
  2  | 
  3  | test.describe('Contact address page', { tag: ['@integration', '@duplicated-in-frontend'] }, () => {
  4  |   test.beforeEach(async ({ journey }) => {
  5  |     await journey.toContactAddress();
  6  |   });
  7  | 
  8  |   test('renders the page controls', async ({ pages }) => {
  9  |     await expect(pages.contactAddress.heading).toBeVisible();
> 10 |     await expect(pages.contactAddress.address('Animal and Plant Health Agency')).toBeVisible();
     |                                                                                  ^ Error: expect(locator).toBeVisible() failed
  11 |     await expect(pages.contactAddress.saveAndContinue).toBeVisible();
  12 |   });
  13 | 
  14 |   test('leaves the contact address unchecked on load', async ({ pages }) => {
  15 |     await expect(pages.contactAddress.address('Animal and Plant Health Agency')).not.toBeChecked();
  16 |   });
  17 | 
  18 |   test('accepts a valid contact address', async ({ pages }) => {
  19 |     await pages.contactAddress.address('Animal and Plant Health Agency').check();
  20 |     await pages.contactAddress.saveAndContinue.click();
  21 | 
  22 |     await expect(pages.page.getByRole('heading', { name: 'There is a problem' })).toHaveCount(0);
  23 |   });
  24 | 
  25 |   test('saving with no contact address selected is allowed and exits to the hub', async ({ pages }) => {
  26 |     await pages.contactAddress.saveAndContinue.click();
  27 | 
  28 |     await expect(pages.overview.heading).toBeVisible();
  29 |     await expect(pages.page.getByRole('heading', { name: 'There is a problem' })).toHaveCount(0);
  30 |   });
  31 | 
  32 |   test('adding a new contact address saves it and offers it selected', async ({ pages }) => {
  33 |     // The book is a persistent server store, so a fresh unique name each run keeps
  34 |     // the created record unambiguous among the offered radios.
  35 |     const createdName = `Created Contact ${Date.now()}`;
  36 | 
  37 |     await pages.page.getByRole('link', { name: 'Add a new contact address' }).click();
  38 |     await expect(pages.page.getByRole('heading', { name: 'Add a new address' })).toBeVisible();
  39 | 
  40 |     await pages.page.getByLabel('Name or organisation name').fill(createdName);
  41 |     await pages.page.getByLabel('Address line 1').fill('12 Contact Way');
  42 |     await pages.page.getByLabel('Town or city').fill('Penrith');
  43 |     await pages.page.getByLabel('Postal or zip code').fill('CA11 7AA');
  44 |     await pages.page.getByLabel('Country').selectOption('United Kingdom');
  45 |     await pages.page.getByLabel('Telephone number').fill('01768 555 0102');
  46 |     await pages.page.getByLabel('Email address').fill('contact@example.co.uk');
  47 |     await pages.page.getByRole('button', { name: 'Save and continue' }).click();
  48 | 
  49 |     await expect(pages.contactAddress.heading).toBeVisible();
  50 |     await expect(pages.contactAddress.address(createdName)).toBeChecked();
  51 |   });
  52 | });
  53 | 
```