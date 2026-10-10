# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: animals/e2e/pages/notification-view-states.spec.ts >> Notification view states >> DRAFT >> Continue: when the notification is unfinished, stays put and names what is left
- Location: tests/animals/e2e/pages/notification-view-states.spec.ts:44:5

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/notification-view$/
Received string:  "http://localhost:3000/live-animals/notifications/GBN-AG-26-N0S4JA/notification-view?refused=1"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    14 × locator resolved to <html lang="en" class="govuk-template">…</html>
       - unexpected value "http://localhost:3000/live-animals/notifications/GBN-AG-26-N0S4JA/notification-view?refused=1"

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
      - /url: /live-animals
    - navigation "Menu":
      - list:
        - listitem:
          - link "Dashboard":
            - /url: /live-animals
            - strong: Dashboard
        - listitem:
          - link "Address book":
            - /url: http://localhost:3002/address-book
        - listitem:
          - link "Manage account":
            - /url: "#"
        - listitem:
          - link "Log out":
            - /url: /auth/sign-out
- paragraph:
  - strong: Alpha
  - text: This is a new service. Help us improve it and
  - link "give your feedback by email":
    - /url: mailto:APHAServiceDesk@apha.gov.uk
  - text: .
- link "Back":
  - /url: /live-animals/notifications/GBN-AG-26-N0S4JA
- main:
  - strong: Draft
  - text: GBN-AG-26-N0S4JA
  - alert:
    - heading "There is a problem" [level=2]
    - list:
      - listitem:
        - link "Complete reason for import":
          - /url: "#reason-for-import"
      - listitem:
        - link "Complete additional animal details":
          - /url: "#additional-animal-details"
      - listitem:
        - link "Complete arrival details":
          - /url: "#arrival-details"
      - listitem:
        - link "Complete transport details":
          - /url: "#transport-details"
      - listitem:
        - link "Complete roles and addresses":
          - /url: "#roles-and-addresses"
      - listitem:
        - link "Complete contact address for this consignment":
          - /url: "#contact-address"
  - heading "Review your notification" [level=1]
  - heading "1. About the consignment" [level=2]
  - heading "Where is this consignment coming from?" [level=3]
  - heading "Import details" [level=4]
  - link "Change import details (Import details)":
    - /url: /live-animals/notifications/GBN-AG-26-N0S4JA/origin?change=1
  - term: Country of origin
  - definition: France
  - term: Region of origin code required
  - definition: "Yes"
  - term: Region of origin code
  - definition: FR-75
  - term: Internal reference number
  - definition: Imports456GB
  - heading "Main reason for import" [level=3]
  - heading "Reason for import" [level=4]
  - list:
    - listitem:
      - link "Change reason for import":
        - /url: /live-animals/notifications/GBN-AG-26-N0S4JA/import-reason?change=1
  - paragraph: "Error: Complete reason for import"
  - term: Reason for import
  - definition: Missing
  - separator
  - heading "2. Description of the goods" [level=2]
  - heading "Commodity details" [level=3]
  - heading "Cow (0102) — Bos taurus" [level=4]
  - list:
    - listitem:
      - link "Change commodity 1":
        - /url: /live-animals/notifications/GBN-AG-26-N0S4JA/consignment-details?change=1
  - term: Commodity code
  - definition: "0102"
  - term: Common name
  - definition: Cow
  - term: Species
  - definition: Bos taurus
  - term: Number of animals
  - definition: "1"
  - term: Number of packages
  - definition: "5"
  - heading "Animal details" [level=5]
  - table:
    - rowgroup:
      - row "Animal Ear tag":
        - columnheader "Animal"
        - columnheader "Ear tag"
    - rowgroup:
      - row "Animal 1 UK123456789012":
        - cell "Animal 1"
        - cell "UK123456789012"
  - heading "Additional details" [level=3]
  - heading "Additional animal details" [level=4]
  - list:
    - listitem:
      - link "Change additional animal details":
        - /url: /live-animals/notifications/GBN-AG-26-N0S4JA/additional-details?change=1
  - paragraph: "Error: Complete additional animal details"
  - term: Certified for
  - definition: Missing
  - term: Includes unweaned animals
  - definition: Missing
  - separator
  - heading "3. Transport and arrival" [level=2]
  - heading "Arrival details" [level=3]
  - heading "Arrival details" [level=4]
  - list:
    - listitem:
      - link "Change arrival details":
        - /url: /live-animals/notifications/GBN-AG-26-N0S4JA/port-of-entry?change=1
  - paragraph: "Error: Complete arrival details"
  - term: Port of entry
  - definition: Missing
  - term: Arrival date at port of entry
  - definition: Missing
  - term: Means of transport to the port of entry
  - definition: Missing
  - term: Transport identification
  - definition: Missing
  - term: Transport document reference
  - definition: Missing
  - heading "Transport details" [level=3]
  - heading "Transport details" [level=4]
  - list:
    - listitem:
      - link "Change transport details":
        - /url: /live-animals/notifications/GBN-AG-26-N0S4JA/transporters?change=1
  - paragraph: "Error: Complete transport details"
  - term: Type
  - definition: Missing
  - separator
  - heading "4. Documents" [level=2]
  - heading "Upload documents" [level=3]
  - heading "Uploaded documents" [level=4]
  - list:
    - listitem:
      - link "Change uploaded documents":
        - /url: /live-animals/notifications/GBN-AG-26-N0S4JA/accompanying-documents?change=1
  - paragraph: You have not added any documents yet.
  - separator
  - heading "5. Consignment parties" [level=2]
  - heading "Roles and addresses" [level=3]
  - heading "Roles and addresses" [level=4]
  - list:
    - listitem:
      - link "Change roles and addresses":
        - /url: /live-animals/notifications/GBN-AG-26-N0S4JA/addresses?change=1
  - paragraph: "Error: Complete roles and addresses"
  - term: Place of origin
  - definition: Missing
  - term: Consignor
  - definition: Missing
  - term: Consignee
  - definition: Missing
  - term: Importer
  - definition: Missing
  - term: Place of destination
  - definition: Missing
  - term: County parish holding (CPH) number
  - definition: Missing
  - separator
  - heading "6. Contact address" [level=2]
  - heading "Contact address for this consignment" [level=3]
  - heading "Contact address for this consignment" [level=4]
  - list:
    - listitem:
      - link "Change contact address for this consignment":
        - /url: /live-animals/notifications/GBN-AG-26-N0S4JA/consignment/contact/select?change=1
  - paragraph: "Error: Complete contact address for this consignment"
  - term: Contact address
  - definition: Missing
  - button "Continue"
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
  1   | import { test, expect } from '@fixtures';
  2   | 
  3   | const REFERENCE_NUMBER_PATTERN = /GBN-AG-\d{2}-[0-9A-Z]{6}/;
  4   | const EXACT_REFERENCE_NUMBER_PATTERN = /^GBN-AG-\d{2}-[0-9A-Z]{6}$/;
  5   | 
  6   | test.describe('Notification view states', { tag: ['@integration', '@duplicated-in-frontend'] }, () => {
  7   |   test.describe('DRAFT', () => {
  8   |     test.beforeEach(async ({ animalsSeededJourney, animalsNotificationActions, journeyContext }) => {
  9   |       await animalsSeededJourney.createDraftNotification('unlocked');
  10  |       await animalsNotificationActions.toNotificationView(journeyContext.journeyId);
  11  |     });
  12  | 
  13  |     test('renders the recorded answers in the numbered design sections', async ({ pages, animalsPages }) => {
  14  |       await expect(animalsPages.notificationView.heading).toBeVisible();
  15  |       await expect(pages.page.getByRole('heading', { name: '1. About the consignment' })).toBeVisible();
  16  |       await expect(pages.page.getByRole('heading', { name: '2. Description of the goods' })).toBeVisible();
  17  |       await expect(pages.page.getByRole('heading', { name: '3. Transport and arrival' })).toBeVisible();
  18  |       await expect(pages.page.getByRole('heading', { name: '4. Documents' })).toBeVisible();
  19  |       await expect(pages.page.getByRole('heading', { name: '5. Consignment parties' })).toBeVisible();
  20  |       await expect(pages.page.getByRole('heading', { name: '6. Contact address' })).toBeVisible();
  21  |       await expect(animalsPages.notificationView.summaryCard('Uploaded documents')).toBeVisible();
  22  |       await expect(animalsPages.notificationView.summaryCard('Uploaded documents')).toContainText('You have not added any documents yet.');
  23  |       await expect(animalsPages.notificationView.summaryCard('Import details')).toContainText('France');
  24  |       await expect(animalsPages.notificationView.summaryCard('Cow (0102) — Bos taurus')).toContainText('Number of animals');
  25  |     });
  26  | 
  27  |     test('shows the Draft strip with the notification reference', async ({ animalsPages, journeyContext }) => {
  28  |       await expect(animalsPages.notificationView.journeyStrip.locator('.govuk-tag')).toHaveText('Draft');
  29  |       await expect(animalsPages.notificationView.journeyStrip).toContainText(journeyContext.journeyId);
  30  |     });
  31  | 
  32  |     test('shows Change links for the recorded answers', async ({ animalsPages }) => {
  33  |       await expect(animalsPages.notificationView.changeLink('Change import details')).toBeVisible();
  34  |       await expect(animalsPages.notificationView.changeLink('Change commodity 1')).toBeVisible();
  35  |     });
  36  | 
  37  |     test('offers submission and none of the post-submit actions', async ({ pages, animalsPages }) => {
  38  |       await expect(animalsPages.notificationView.continueButton).toBeVisible();
  39  |       await expect(pages.page.getByRole('button', { name: 'Copy as new' })).toHaveCount(0);
  40  |       await expect(pages.page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
  41  |       await expect(animalsPages.notificationView.cancelAmendment).toHaveCount(0);
  42  |     });
  43  | 
  44  |     test('Continue: when the notification is unfinished, stays put and names what is left', async ({ pages, animalsPages }) => {
  45  |       await animalsPages.notificationView.continueButton.click();
  46  | 
> 47  |       await expect(pages.page).toHaveURL(/\/notification-view$/);
      |                                ^ Error: expect(page).toHaveURL(expected) failed
  48  |       await expect(animalsPages.notificationView.errorSummary).toBeVisible();
  49  |       await expect(animalsPages.notificationView.errorSummary).toContainText('There is a problem');
  50  |       await expect(animalsPages.notificationView.errorSummary.getByRole('link', { name: 'Complete arrival details' })).toBeVisible();
  51  |     });
  52  |   });
  53  | 
  54  |   test.describe('DRAFT ready to submit', () => {
  55  |     test.beforeEach(async ({ animalsSeededJourney, animalsNotificationActions, journeyContext }) => {
  56  |       await animalsSeededJourney.createDraftNotification('readyToSubmit');
  57  |       await animalsNotificationActions.toNotificationView(journeyContext.journeyId);
  58  |     });
  59  | 
  60  |     test('shows no error summary once every section is answered', async ({ animalsPages }) => {
  61  |       await expect(animalsPages.notificationView.heading).toBeVisible();
  62  |       await expect(animalsPages.notificationView.errorSummary).toHaveCount(0);
  63  |     });
  64  | 
  65  |     test('Continue moves on to the declaration', async ({ pages, animalsPages }) => {
  66  |       await animalsPages.notificationView.continueButton.click();
  67  |       await expect(pages.page).toHaveURL(/\/declaration$/);
  68  |       await expect(animalsPages.declaration.heading).toBeVisible();
  69  |     });
  70  |   });
  71  | 
  72  |   test.describe('SUBMITTED', () => {
  73  |     test.beforeEach(async ({ animalsSeededJourney, animalsNotificationActions, journeyContext }) => {
  74  |       await animalsSeededJourney.createSubmittedNotification();
  75  |       await animalsNotificationActions.toNotificationView(journeyContext.journeyId);
  76  |     });
  77  | 
  78  |     test('lands on the view page with the Submitted strip and reference', async ({ pages, animalsPages, journeyContext }) => {
  79  |       await expect(pages.page).toHaveURL(new RegExp(`${animalsPages.notificationView.expectedUrl(journeyContext.journeyId)}$`));
  80  |       await expect(animalsPages.notificationView.journeyStrip.locator('.govuk-tag')).toHaveText('Submitted');
  81  |       await expect(animalsPages.notificationView.journeyStrip).toContainText(journeyContext.journeyId);
  82  |     });
  83  | 
  84  |     test('offers Copy as new and Delete on the read-only view', async ({ pages, animalsPages }) => {
  85  |       await expect(pages.page.getByRole('button', { name: 'Copy as new' })).toBeVisible();
  86  |       await expect(pages.page.getByRole('button', { name: 'Delete' })).toBeVisible();
  87  |       await expect(animalsPages.notificationView.cancelAmendment).toHaveCount(0);
  88  |     });
  89  | 
  90  |     test('copies the submitted notification to a new draft', async ({ animalsPages, journeyContext }) => {
  91  |       const originalReferenceNumber = journeyContext.journeyId;
  92  |       await animalsPages.notificationView.btnCopyAsNew.click();
  93  | 
  94  |       await animalsPages.overview.heading.waitFor();
  95  |       const copiedReferenceNumber = (await animalsPages.notificationView.referenceNumberCaption.textContent())?.match(
  96  |         REFERENCE_NUMBER_PATTERN,
  97  |       )?.[0];
  98  |       expect(copiedReferenceNumber).toMatch(EXACT_REFERENCE_NUMBER_PATTERN);
  99  |       expect(copiedReferenceNumber).not.toEqual(originalReferenceNumber);
  100 |     });
  101 | 
  102 |     test('still renders the recorded answers after submission', async ({ animalsPages }) => {
  103 |       await expect(animalsPages.notificationView.summaryCard('Import details')).toContainText('France');
  104 |       await expect(animalsPages.notificationView.summaryCard('Cow (0102) — Bos taurus')).toBeVisible();
  105 |     });
  106 |   });
  107 | });
  108 | 
```