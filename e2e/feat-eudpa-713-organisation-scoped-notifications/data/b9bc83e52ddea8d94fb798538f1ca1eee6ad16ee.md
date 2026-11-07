# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: animals/e2e/features/documents-scan-lifecycle.spec.ts >> Documents scan lifecycle >> clean upload: Save and continue reaches the overview, and the row settles to Check completed with a view link on reopening
- Location: tests/animals/e2e/features/documents-scan-lifecycle.spec.ts:46:3

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: locator.click: Test timeout of 90000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Save and add another' })
    - locator resolved to <button value="add" type="submit" name="action" id="add-document" aria-disabled="true" data-govuk-button-init="" data-module="govuk-button" aria-describedby="add-document-error" class="govuk-button govuk-button--secondary">↵  Save and add another↵</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    171 × waiting for element to be visible, enabled and stable
        - element is not enabled
      - retrying click action
        - waiting 500ms
    - waiting for element to be visible, enabled and stable

```

# Page snapshot

```yaml
- generic [ref=f9e1]:
  - link "Skip to main content" [ref=f9e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f9e3]:
    - link [ref=f9e7] [cursor=pointer]:
      - /url: https://www.gov.uk/
      - img "GOV.UK" [ref=f9e8]
    - region "Service information" [ref=f9e21]:
      - generic [ref=f9e23]:
        - link "Import notification service" [ref=f9e25] [cursor=pointer]:
          - /url: /live-animals
        - navigation "Menu" [ref=f9e26]:
          - list [ref=f9e27]:
            - listitem [ref=f9e28]:
              - link [ref=f9e29] [cursor=pointer]:
                - /url: /live-animals
                - strong [ref=f9e30]: Dashboard
            - listitem [ref=f9e31]:
              - link "Address book" [ref=f9e32] [cursor=pointer]:
                - /url: http://localhost:3002/address-book
            - listitem [ref=f9e33]:
              - link "Manage account" [ref=f9e34] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=f9e35]:
              - link "Log out" [ref=f9e36] [cursor=pointer]:
                - /url: /auth/sign-out
  - generic [ref=f9e37]:
    - paragraph [ref=f9e39]:
      - strong [ref=f9e40]: Alpha
      - generic [ref=f9e41]:
        - text: This is a new service. Help us improve it and
        - link "give your feedback by email" [ref=f9e42] [cursor=pointer]:
          - /url: mailto:APHAServiceDesk@apha.gov.uk
        - text: .
    - paragraph [ref=f9e44]:
      - strong [ref=f9e45]:
        - generic [ref=f9e46]: "This page’s status:"
        - text: Detailing
        - generic [ref=f9e47]: .
      - generic [ref=f9e48]: We’re keeping this page. We’re still working out the detail.
    - link "Back" [ref=f9e49] [cursor=pointer]:
      - /url: /live-animals/notifications/GBN-AG-26-ESZFTP
    - main [ref=f9e50]:
      - generic [ref=f9e52]:
        - generic [ref=f9e53]:
          - strong [ref=f9e54]: Draft
          - text: GBN-AG-26-ESZFTP
        - generic [ref=f9e56]:
          - alert [ref=f9e59]:
            - heading "There is a problem" [level=2] [ref=f9e60]
            - list [ref=f9e62]:
              - listitem [ref=f9e63]:
                - link "Documents cannot be uploaded at the moment. Reload the page or come back later." [ref=f9e64] [cursor=pointer]:
                  - /url: "#add-document"
          - generic [ref=f9e65]: Documents
          - heading "Upload documents" [level=1] [ref=f9e66]
          - paragraph [ref=f9e67]: You must attach an ITAHC if this consignment requires one. If you do not have it now, you can add it later. All documents should be uploaded before the consignment arrives at the UK port. Documents must be in English and you must upload all pages.
          - paragraph [ref=f9e68]: "Other documents you may need to attach include:"
          - list [ref=f9e69]:
            - listitem [ref=f9e70]: import licences or authorisations
            - listitem [ref=f9e71]: commercial documents or invoices
          - group [ref=f9e72]:
            - generic "Check which additional documents you must upload" [ref=f9e73] [cursor=pointer]
        - generic [ref=f9e74]:
          - region [ref=f9e75]:
            - heading "File upload" [level=2] [ref=f9e77]
            - generic [ref=f9e80]:
              - generic [ref=f9e81]:
                - generic [ref=f9e82]: Document reference
                - textbox "Document reference" [ref=f9e83]: PWSCAN1793961787544
              - generic [ref=f9e84]:
                - generic [ref=f9e85]: Document type
                - combobox "Document type" [ref=f9e86]:
                  - option "Select one"
                  - option "ITAHC (Intra Trade Animal Health Certificate)" [selected]
                  - option "Other veterinary certificate / veterinary declaration"
                  - option "Self-declaration"
                  - option "Journey log"
                  - option "Import permit / authorisation"
                  - option "CITES permit/certificate"
                  - option "Air waybill"
                  - option "Sea waybill"
                  - option "Rail waybill"
                  - option "Bill of lading"
                  - option "Commercial invoice"
                  - option "Packing list / species list"
                  - option "Other supporting documents"
              - generic [ref=f9e88]:
                - generic [ref=f9e89]: Date of issue
                - generic [ref=f9e90]: For example, 27/3/2026
                - generic [ref=f9e92]:
                  - textbox "Date of issue" [active] [ref=f9e93]: 03/01/2026
                  - button "Choose date" [ref=f9e94] [cursor=pointer]
              - generic [ref=f9e100]:
                - generic [ref=f9e101]: Attachment
                - generic [ref=f9e102]:
                  - paragraph [ref=f9e103]: "Your file must be:"
                  - list [ref=f9e104]:
                    - listitem [ref=f9e105]: files that are smaller than 50MB
                    - listitem [ref=f9e106]: PDF, DOC, DOCX, JPEG, JPG, PNG, XLS or XLSX
                    - listitem [ref=f9e107]: up to a maximum of 15 files
                    - listitem [ref=f9e108]: ZIP files are not allowed for security reasons
                - button "Attachment , safe-file-1kb.pdf Choose file or drop file" [ref=f9e110] [cursor=pointer]:
                  - generic [ref=f9e111]: safe-file-1kb.pdf
                  - generic [ref=f9e112]: ","
                  - generic [ref=f9e113]:
                    - generic [ref=f9e114]: Choose file
                    - generic [ref=f9e115]: or drop file
              - generic [ref=f9e117]:
                - paragraph [ref=f9e118]:
                  - generic [ref=f9e119]: "Error:"
                  - text: Documents cannot be uploaded at the moment. Reload the page or come back later.
                - button "Save and add another" [disabled] [ref=f9e120] [cursor=pointer]
          - generic [ref=f9e121]:
            - button "Save and continue" [ref=f9e122] [cursor=pointer]
            - button "Save and return to overview" [ref=f9e123] [cursor=pointer]
          - paragraph [ref=f9e124]:
            - link "Cancel and return to overview" [ref=f9e125] [cursor=pointer]:
              - /url: /live-animals/notifications/GBN-AG-26-ESZFTP
  - contentinfo [ref=f9e127]:
    - generic [ref=f9e140]:
      - generic [ref=f9e141]:
        - heading "Support links" [level=2] [ref=f9e142]
        - list [ref=f9e143]:
          - listitem [ref=f9e144]:
            - link "Privacy" [ref=f9e145] [cursor=pointer]:
              - /url: https://www.gov.uk/help/privacy-notice
          - listitem [ref=f9e146]:
            - link "Cookies" [ref=f9e147] [cursor=pointer]:
              - /url: https://www.gov.uk/help/cookies
          - listitem [ref=f9e148]:
            - link "Accessibility statement" [ref=f9e149] [cursor=pointer]:
              - /url: https://www.gov.uk/help/accessibility-statement
        - generic [ref=f9e152]:
          - text: All content is available under the
          - link "Open Government Licence v3.0" [ref=f9e153] [cursor=pointer]:
            - /url: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
          - text: ", except where otherwise stated"
      - link "© Crown copyright" [ref=f9e155] [cursor=pointer]:
        - /url: https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright/
```

# Test source

```ts
  1  | import path from 'node:path';
  2  | import { test, expect } from '@fixtures';
  3  | import { fileUploadPaths } from '@resources/file-upload/paths';
  4  | import { fileUploadTimeouts } from '@config/file-upload-timeouts';
  5  | import { writeEicarPdfFile } from '@utils/eicar-file-writer';
  6  | import { firstScanStatus } from '@utils/scan-status';
  7  | 
  8  | const issueDate = '03/01/2026';
  9  | 
  10 | test.describe('Documents scan lifecycle', { tag: '@duplicated-in-frontend' }, () => {
  11 |   test.beforeEach(async ({ animalsJourney }) => {
  12 |     await animalsJourney.toAccompanyingDocuments();
  13 |   });
  14 | 
  15 |   test('infected upload: accepted while scanning, then Virus found with error summary blocking Save and continue until it is removed', async ({
  16 |     pages,
  17 |     animalsPages,
  18 |   }, testInfo) => {
  19 |     test.slow();
  20 |     const eicar = await writeEicarPdfFile(path.join(testInfo.outputDir, 'file-upload'));
  21 | 
  22 |     const reference = `PWVIRUS${Date.now()}`;
  23 |     await animalsPages.accompanyingDocuments.fillDocument(reference, issueDate, eicar.filePath);
  24 |     await animalsPages.accompanyingDocuments.saveAndAddAnother.click();
  25 | 
  26 |     const row = animalsPages.accompanyingDocuments.documentRow(reference);
  27 |     await firstScanStatus(row, 'Virus found');
  28 | 
  29 |     await expect(row).toContainText('Virus found', { timeout: fileUploadTimeouts.virusScanComplete });
  30 |     await expect(pages.page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
  31 |     await expect(
  32 |       pages.page.getByText(`${eicar.fileName} cannot be used. Remove it and try again with a different file.`).first(),
  33 |     ).toBeVisible();
  34 |     await expect(animalsPages.accompanyingDocuments.viewFile(1)).toHaveCount(0);
  35 | 
  36 |     await animalsPages.accompanyingDocuments.saveAndContinue.click();
  37 |     await expect(
  38 |       pages.page.getByText(`${eicar.fileName} cannot be used. Remove it and try again with a different file.`).first(),
  39 |     ).toBeVisible();
  40 | 
  41 |     await animalsPages.accompanyingDocuments.removeDocument(1).click();
  42 |     await animalsPages.accompanyingDocuments.saveAndContinue.click();
  43 |     await expect(animalsPages.overview.heading).toBeVisible();
  44 |   });
  45 | 
  46 |   test('clean upload: Save and continue reaches the overview, and the row settles to Check completed with a view link on reopening', async ({
  47 |     animalsPages,
  48 |   }) => {
  49 |     test.slow();
  50 |     const reference = `PWSCAN${Date.now()}`;
  51 |     await animalsPages.accompanyingDocuments.fillDocument(reference, issueDate, fileUploadPaths.safeFile1kbPdf);
> 52 |     await animalsPages.accompanyingDocuments.saveAndAddAnother.click();
     |                                                                ^ Error: locator.click: Test timeout of 90000ms exceeded.
  53 | 
  54 |     const row = animalsPages.accompanyingDocuments.documentRow(reference);
  55 |     const { pending, text } = await firstScanStatus(row, 'Check completed');
  56 |     if (pending) {
  57 |       expect(text).not.toContain('View file');
  58 |     }
  59 |     await expect(animalsPages.accompanyingDocuments.removeDocument(1)).toBeVisible();
  60 | 
  61 |     await animalsPages.accompanyingDocuments.saveAndContinue.click();
  62 |     await expect(animalsPages.overview.heading).toBeVisible();
  63 | 
  64 |     await animalsPages.overview.task('Upload documents').click();
  65 |     const reopenedRow = animalsPages.accompanyingDocuments.documentRow(reference);
  66 |     await expect(reopenedRow).toContainText('Check completed', { timeout: fileUploadTimeouts.virusScanComplete });
  67 |     await expect(animalsPages.accompanyingDocuments.viewFile(1)).toBeVisible();
  68 |   });
  69 | });
  70 | 
```