# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: animals/e2e/features/documents-limits.spec.ts >> Documents limits >> accepts a fifteenth document and rejects a sixteenth with the maximum-documents error
- Location: tests/animals/e2e/features/documents-limits.spec.ts:11:3

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: locator.click: Test timeout of 120000ms exceeded.
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
    106 × waiting for element to be visible, enabled and stable
        - element is not enabled
      - retrying click action
        - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=f39e1]:
  - link "Skip to main content" [ref=f39e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f39e3]:
    - link [ref=f39e7] [cursor=pointer]:
      - /url: https://www.gov.uk/
      - img "GOV.UK" [ref=f39e8]
    - region "Service information" [ref=f39e21]:
      - generic [ref=f39e23]:
        - link "Import notification service" [ref=f39e25] [cursor=pointer]:
          - /url: /live-animals
        - navigation "Menu" [ref=f39e26]:
          - list [ref=f39e27]:
            - listitem [ref=f39e28]:
              - link [ref=f39e29] [cursor=pointer]:
                - /url: /live-animals
                - strong [ref=f39e30]: Dashboard
            - listitem [ref=f39e31]:
              - link "Address book" [ref=f39e32] [cursor=pointer]:
                - /url: http://localhost:3002/address-book
            - listitem [ref=f39e33]:
              - link "Manage account" [ref=f39e34] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=f39e35]:
              - link "Log out" [ref=f39e36] [cursor=pointer]:
                - /url: /auth/sign-out
  - generic [ref=f39e37]:
    - paragraph [ref=f39e39]:
      - strong [ref=f39e40]: Alpha
      - generic [ref=f39e41]:
        - text: This is a new service. Help us improve it and
        - link "give your feedback by email" [ref=f39e42] [cursor=pointer]:
          - /url: mailto:APHAServiceDesk@apha.gov.uk
        - text: .
    - paragraph [ref=f39e44]:
      - strong [ref=f39e45]:
        - generic [ref=f39e46]: "This page’s status:"
        - text: Detailing
        - generic [ref=f39e47]: .
      - generic [ref=f39e48]: We’re keeping this page. We’re still working out the detail.
    - link "Back" [ref=f39e49] [cursor=pointer]:
      - /url: /live-animals/notifications/GBN-AG-26-WTPP7G
    - main [ref=f39e50]:
      - generic [ref=f39e52]:
        - generic [ref=f39e53]:
          - strong [ref=f39e54]: Draft
          - text: GBN-AG-26-WTPP7G
        - generic [ref=f39e55]: Documents
        - heading "Upload documents" [level=1] [ref=f39e56]
        - paragraph [ref=f39e57]: You must attach an ITAHC if this consignment requires one. If you do not have it now, you can add it later. All documents should be uploaded before the consignment arrives at the UK port. Documents must be in English and you must upload all pages.
        - paragraph [ref=f39e58]: "Other documents you may need to attach include:"
        - list [ref=f39e59]:
          - listitem [ref=f39e60]: import licences or authorisations
          - listitem [ref=f39e61]: commercial documents or invoices
        - group [ref=f39e62]:
          - generic "Check which additional documents you must upload" [ref=f39e63] [cursor=pointer]
        - generic [ref=f39e64]:
          - region [ref=f39e65]:
            - heading "File upload" [level=2] [ref=f39e67]
            - generic [ref=f39e68]:
              - generic [ref=f39e69]:
                - generic [ref=f39e70]: Document reference
                - generic [ref=f39e71]: For example, GBHC1234567890.
                - textbox "Document reference" [ref=f39e72]: PWCAP179276398822316
              - generic [ref=f39e73]:
                - generic [ref=f39e74]: Document type
                - combobox "Document type" [ref=f39e75]:
                  - option "Select one"
                  - option "Intra Trade Animal Health Certificate (ITAHC)" [selected]
                  - option "Veterinary health certificate"
                  - option "Air waybill"
                  - option "Import permit"
                  - option "Letter of authority (Directive 2008/61/EC)"
                  - option "Commercial invoice"
                  - option "Sea waybill"
                  - option "Rail waybill"
                  - option "Bill of lading"
                  - option "Catch certificate"
                  - option "Laboratory sampling results for aflatoxin (Reg 2019/1793)"
                  - option "Health certificate"
                  - option "Journey log"
                  - option "Other"
              - generic [ref=f39e77]:
                - generic [ref=f39e78]: Date of issue
                - generic [ref=f39e79]: For example, 12/12/2025
                - generic [ref=f39e81]:
                  - textbox "Date of issue" [active] [ref=f39e82]: 03/01/2026
                  - button "Choose date" [ref=f39e83] [cursor=pointer]
              - generic [ref=f39e89]:
                - generic [ref=f39e90]: Attachment
                - generic [ref=f39e91]:
                  - paragraph [ref=f39e92]: "Your file must be:"
                  - list [ref=f39e93]:
                    - listitem [ref=f39e94]: smaller than 50MB
                    - listitem [ref=f39e95]: a PDF, DOC, DOCX, JPEG, JPG, PNG, XLS or XLSX
                    - listitem [ref=f39e96]: up to a maximum of 15 files
                    - listitem [ref=f39e97]: ZIP files are not allowed for security reasons
                - button "Attachment , safe-file-1kb.pdf Choose file or drop file" [ref=f39e99] [cursor=pointer]:
                  - generic [ref=f39e100]: safe-file-1kb.pdf
                  - generic [ref=f39e101]: ","
                  - generic [ref=f39e102]:
                    - generic [ref=f39e103]: Choose file
                    - generic [ref=f39e104]: or drop file
              - generic [ref=f39e106]:
                - paragraph [ref=f39e107]:
                  - generic [ref=f39e108]: "Error:"
                  - text: You can upload a maximum of 15 files
                - button "Save and add another" [disabled] [ref=f39e109] [cursor=pointer]
              - table [ref=f39e111]:
                - caption [ref=f39e112]: Documents you have added
                - rowgroup [ref=f39e113]:
                  - row [ref=f39e114]:
                    - columnheader "Document reference" [ref=f39e115]
                    - columnheader "Document type" [ref=f39e116]
                    - columnheader "Date of issue" [ref=f39e117]
                    - columnheader "Status" [ref=f39e118]
                    - columnheader "Actions" [ref=f39e119]
                - rowgroup [ref=f39e121]:
                  - row [ref=f39e122]:
                    - cell "PWCAP17927639265701" [ref=f39e123]
                    - cell "Intra Trade Animal Health Certificate (ITAHC)" [ref=f39e124]
                    - cell "03/01/2026" [ref=f39e125]
                    - cell "Virus check status for PWCAP17927639265701 Check completed" [ref=f39e126]:
                      - generic [ref=f39e127]: Virus check status for PWCAP17927639265701
                      - strong [ref=f39e128]: Check completed
                    - cell [ref=f39e129]:
                      - link "View file for document 1" [ref=f39e130] [cursor=pointer]:
                        - /url: /live-animals/notifications/GBN-AG-26-WTPP7G/accompanying-documents/19d30d40-9bdf-4f91-a201-cd6d179c6724/file
                        - text: View file
                        - generic [ref=f39e131]: for document 1
                      - button "Remove document 1" [ref=f39e132] [cursor=pointer]:
                        - text: Remove
                        - generic [ref=f39e133]: document 1
                  - row [ref=f39e134]:
                    - cell "PWCAP17927639304442" [ref=f39e135]
                    - cell "Intra Trade Animal Health Certificate (ITAHC)" [ref=f39e136]
                    - cell "03/01/2026" [ref=f39e137]
                    - cell "Virus check status for PWCAP17927639304442 Check completed" [ref=f39e138]:
                      - generic [ref=f39e139]: Virus check status for PWCAP17927639304442
                      - strong [ref=f39e140]: Check completed
                    - cell [ref=f39e141]:
                      - link "View file for document 2" [ref=f39e142] [cursor=pointer]:
                        - /url: /live-animals/notifications/GBN-AG-26-WTPP7G/accompanying-documents/b9a36c01-0890-4019-b256-8d33195766cd/file
                        - text: View file
                        - generic [ref=f39e143]: for document 2
                      - button "Remove document 2" [ref=f39e144] [cursor=pointer]:
                        - text: Remove
                        - generic [ref=f39e145]: document 2
                  - row [ref=f39e146]:
                    - cell "PWCAP17927639370743" [ref=f39e147]
                    - cell "Intra Trade Animal Health Certificate (ITAHC)" [ref=f39e148]
                    - cell "03/01/2026" [ref=f39e149]
                    - cell "Virus check status for PWCAP17927639370743 Check completed" [ref=f39e150]:
                      - generic [ref=f39e151]: Virus check status for PWCAP17927639370743
                      - strong [ref=f39e152]: Check completed
                    - cell [ref=f39e153]:
                      - link "View file for document 3" [ref=f39e154] [cursor=pointer]:
                        - /url: /live-animals/notifications/GBN-AG-26-WTPP7G/accompanying-documents/08c12160-a067-4249-816d-17346721e33c/file
                        - text: View file
                        - generic [ref=f39e155]: for document 3
                      - button "Remove document 3" [ref=f39e156] [cursor=pointer]:
                        - text: Remove
                        - generic [ref=f39e157]: document 3
                  - row [ref=f39e158]:
                    - cell "PWCAP17927639408044" [ref=f39e159]
                    - cell "Intra Trade Animal Health Certificate (ITAHC)" [ref=f39e160]
                    - cell "03/01/2026" [ref=f39e161]
                    - cell "Virus check status for PWCAP17927639408044 Check completed" [ref=f39e162]:
                      - generic [ref=f39e163]: Virus check status for PWCAP17927639408044
                      - strong [ref=f39e164]: Check completed
                    - cell [ref=f39e165]:
                      - link "View file for document 4" [ref=f39e166] [cursor=pointer]:
                        - /url: /live-animals/notifications/GBN-AG-26-WTPP7G/accompanying-documents/ca36067b-085f-4d92-9f85-319aa541ba03/file
                        - text: View file
                        - generic [ref=f39e167]: for document 4
                      - button "Remove document 4" [ref=f39e168] [cursor=pointer]:
                        - text: Remove
                        - generic [ref=f39e169]: document 4
                  - row [ref=f39e170]:
                    - cell "PWCAP17927639445575" [ref=f39e171]
                    - cell "Intra Trade Animal Health Certificate (ITAHC)" [ref=f39e172]
                    - cell "03/01/2026" [ref=f39e173]
                    - cell "Virus check status for PWCAP17927639445575 Check completed" [ref=f39e174]:
                      - generic [ref=f39e175]: Virus check status for PWCAP17927639445575
                      - strong [ref=f39e176]: Check completed
                    - cell [ref=f39e177]:
                      - link "View file for document 5" [ref=f39e178] [cursor=pointer]:
                        - /url: /live-animals/notifications/GBN-AG-26-WTPP7G/accompanying-documents/8cf97643-568f-4671-9854-85598b959039/file
                        - text: View file
                        - generic [ref=f39e179]: for document 5
                      - button "Remove document 5" [ref=f39e180] [cursor=pointer]:
                        - text: Remove
                        - generic [ref=f39e181]: document 5
                  - row [ref=f39e182]:
                    - cell "PWCAP17927639481816" [ref=f39e183]
                    - cell "Intra Trade Animal Health Certificate (ITAHC)" [ref=f39e184]
                    - cell "03/01/2026" [ref=f39e185]
                    - cell "Virus check status for PWCAP17927639481816 Check completed" [ref=f39e186]:
                      - generic [ref=f39e187]: Virus check status for PWCAP17927639481816
                      - strong [ref=f39e188]: Check completed
                    - cell [ref=f39e189]:
                      - link "View file for document 6" [ref=f39e190] [cursor=pointer]:
                        - /url: /live-animals/notifications/GBN-AG-26-WTPP7G/accompanying-documents/e71c02b9-7cfd-4c16-b254-b8a6d9c072ca/file
                        - text: View file
                        - generic [ref=f39e191]: for document 6
                      - button "Remove document 6" [ref=f39e192] [cursor=pointer]:
                        - text: Remove
                        - generic [ref=f39e193]: document 6
                  - row [ref=f39e194]:
                    - cell "PWCAP17927639518577" [ref=f39e195]
                    - cell "Intra Trade Animal Health Certificate (ITAHC)" [ref=f39e196]
                    - cell "03/01/2026" [ref=f39e197]
                    - cell "Virus check status for PWCAP17927639518577 Check completed" [ref=f39e198]:
                      - generic [ref=f39e199]: Virus check status for PWCAP17927639518577
                      - strong [ref=f39e200]: Check completed
                    - cell [ref=f39e201]:
                      - link "View file for document 7" [ref=f39e202] [cursor=pointer]:
                        - /url: /live-animals/notifications/GBN-AG-26-WTPP7G/accompanying-documents/d8bab136-4c59-4e94-a1b8-8de22dc30b23/file
                        - text: View file
                        - generic [ref=f39e203]: for document 7
                      - button "Remove document 7" [ref=f39e204] [cursor=pointer]:
                        - text: Remove
                        - generic [ref=f39e205]: document 7
                  - row [ref=f39e206]:
                    - cell "PWCAP17927639585698" [ref=f39e207]
                    - cell "Intra Trade Animal Health Certificate (ITAHC)" [ref=f39e208]
                    - cell "03/01/2026" [ref=f39e209]
                    - cell "Virus check status for PWCAP17927639585698 Check completed" [ref=f39e210]:
                      - generic [ref=f39e211]: Virus check status for PWCAP17927639585698
                      - strong [ref=f39e212]: Check completed
                    - cell [ref=f39e213]:
                      - link "View file for document 8" [ref=f39e214] [cursor=pointer]:
                        - /url: /live-animals/notifications/GBN-AG-26-WTPP7G/accompanying-documents/e52f9b95-ad2b-43e7-9634-91960d1b037b/file
                        - text: View file
                        - generic [ref=f39e215]: for document 8
                      - button "Remove document 8" [ref=f39e216] [cursor=pointer]:
                        - text: Remove
                        - generic [ref=f39e217]: document 8
                  - row [ref=f39e218]:
                    - cell "PWCAP17927639622269" [ref=f39e219]
                    - cell "Intra Trade Animal Health Certificate (ITAHC)" [ref=f39e220]
                    - cell "03/01/2026" [ref=f39e221]
                    - cell "Virus check status for PWCAP17927639622269 Check completed" [ref=f39e222]:
                      - generic [ref=f39e223]: Virus check status for PWCAP17927639622269
                      - strong [ref=f39e224]: Check completed
                    - cell [ref=f39e225]:
                      - link "View file for document 9" [ref=f39e226] [cursor=pointer]:
                        - /url: /live-animals/notifications/GBN-AG-26-WTPP7G/accompanying-documents/740d2f52-e69f-4db7-a999-3dfa4af084c6/file
                        - text: View file
                        - generic [ref=f39e227]: for document 9
                      - button "Remove document 9" [ref=f39e228] [cursor=pointer]:
                        - text: Remove
                        - generic [ref=f39e229]: document 9
                  - row [ref=f39e230]:
                    - cell "PWCAP179276396583310" [ref=f39e231]
                    - cell "Intra Trade Animal Health Certificate (ITAHC)" [ref=f39e232]
                    - cell "03/01/2026" [ref=f39e233]
                    - cell "Virus check status for PWCAP179276396583310 Check completed" [ref=f39e234]:
                      - generic [ref=f39e235]: Virus check status for PWCAP179276396583310
                      - strong [ref=f39e236]: Check completed
                    - cell [ref=f39e237]:
                      - link "View file for document 10" [ref=f39e238] [cursor=pointer]:
                        - /url: /live-animals/notifications/GBN-AG-26-WTPP7G/accompanying-documents/85fe9012-95e7-4125-b886-a6cb7bac3b72/file
                        - text: View file
                        - generic [ref=f39e239]: for document 10
                      - button "Remove document 10" [ref=f39e240] [cursor=pointer]:
                        - text: Remove
                        - generic [ref=f39e241]: document 10
                  - row [ref=f39e242]:
                    - cell "PWCAP179276396953011" [ref=f39e243]
                    - cell "Intra Trade Animal Health Certificate (ITAHC)" [ref=f39e244]
                    - cell "03/01/2026" [ref=f39e245]
                    - cell "Virus check status for PWCAP179276396953011 Check completed" [ref=f39e246]:
                      - generic [ref=f39e247]: Virus check status for PWCAP179276396953011
                      - strong [ref=f39e248]: Check completed
                    - cell [ref=f39e249]:
                      - link "View file for document 11" [ref=f39e250] [cursor=pointer]:
                        - /url: /live-animals/notifications/GBN-AG-26-WTPP7G/accompanying-documents/e3f2b685-5560-497d-a042-32aa79def3e6/file
                        - text: View file
                        - generic [ref=f39e251]: for document 11
                      - button "Remove document 11" [ref=f39e252] [cursor=pointer]:
                        - text: Remove
                        - generic [ref=f39e253]: document 11
                  - row [ref=f39e254]:
                    - cell "PWCAP179276397331712" [ref=f39e255]
                    - cell "Intra Trade Animal Health Certificate (ITAHC)" [ref=f39e256]
                    - cell "03/01/2026" [ref=f39e257]
                    - cell "Virus check status for PWCAP179276397331712 Check completed" [ref=f39e258]:
                      - generic [ref=f39e259]: Virus check status for PWCAP179276397331712
                      - strong [ref=f39e260]: Check completed
                    - cell [ref=f39e261]:
                      - link "View file for document 12" [ref=f39e262] [cursor=pointer]:
                        - /url: /live-animals/notifications/GBN-AG-26-WTPP7G/accompanying-documents/d3566ba8-7644-4841-9bbb-01bb9c51ec34/file
                        - text: View file
                        - generic [ref=f39e263]: for document 12
                      - button "Remove document 12" [ref=f39e264] [cursor=pointer]:
                        - text: Remove
                        - generic [ref=f39e265]: document 12
                  - row [ref=f39e266]:
                    - cell "PWCAP179276397716813" [ref=f39e267]
                    - cell "Intra Trade Animal Health Certificate (ITAHC)" [ref=f39e268]
                    - cell "03/01/2026" [ref=f39e269]
                    - cell "Virus check status for PWCAP179276397716813 Check completed" [ref=f39e270]:
                      - generic [ref=f39e271]: Virus check status for PWCAP179276397716813
                      - strong [ref=f39e272]: Check completed
                    - cell [ref=f39e273]:
                      - link "View file for document 13" [ref=f39e274] [cursor=pointer]:
                        - /url: /live-animals/notifications/GBN-AG-26-WTPP7G/accompanying-documents/07e600f1-8e3d-4e8a-8a69-ee55171908e2/file
                        - text: View file
                        - generic [ref=f39e275]: for document 13
                      - button "Remove document 13" [ref=f39e276] [cursor=pointer]:
                        - text: Remove
                        - generic [ref=f39e277]: document 13
                  - row [ref=f39e278]:
                    - cell "PWCAP179276398089014" [ref=f39e279]
                    - cell "Intra Trade Animal Health Certificate (ITAHC)" [ref=f39e280]
                    - cell "03/01/2026" [ref=f39e281]
                    - cell "Virus check status for PWCAP179276398089014 Check completed" [ref=f39e282]:
                      - generic [ref=f39e283]: Virus check status for PWCAP179276398089014
                      - strong [ref=f39e284]: Check completed
                    - cell [ref=f39e285]:
                      - link "View file for document 14" [ref=f39e286] [cursor=pointer]:
                        - /url: /live-animals/notifications/GBN-AG-26-WTPP7G/accompanying-documents/c1180aff-03fd-4dd1-a8f9-ba2c711d342a/file
                        - text: View file
                        - generic [ref=f39e287]: for document 14
                      - button "Remove document 14" [ref=f39e288] [cursor=pointer]:
                        - text: Remove
                        - generic [ref=f39e289]: document 14
                  - row [ref=f39e290]:
                    - cell "PWCAP179276398453915" [ref=f39e291]
                    - cell "Intra Trade Animal Health Certificate (ITAHC)" [ref=f39e292]
                    - cell "03/01/2026" [ref=f39e293]
                    - cell "Virus check status for PWCAP179276398453915 Check completed" [ref=f39e294]:
                      - generic [ref=f39e295]: Virus check status for PWCAP179276398453915
                      - strong [ref=f39e296]: Check completed
                    - cell [ref=f39e297]:
                      - link "View file for document 15" [ref=f39e298] [cursor=pointer]:
                        - /url: /live-animals/notifications/GBN-AG-26-WTPP7G/accompanying-documents/e28ea4b0-491a-411b-8ce9-6c5cbf6cf2f4/file
                        - text: View file
                        - generic [ref=f39e299]: for document 15
                      - button "Remove document 15" [ref=f39e300] [cursor=pointer]:
                        - text: Remove
                        - generic [ref=f39e301]: document 15
          - generic [ref=f39e302]:
            - button "Save and continue" [ref=f39e303] [cursor=pointer]
            - button "Save and return to overview" [ref=f39e304] [cursor=pointer]
          - paragraph [ref=f39e305]:
            - link "Cancel and return to overview" [ref=f39e306] [cursor=pointer]:
              - /url: /live-animals/notifications/GBN-AG-26-WTPP7G
  - contentinfo [ref=f39e308]:
    - generic [ref=f39e321]:
      - generic [ref=f39e322]:
        - heading "Support links" [level=2] [ref=f39e323]
        - list [ref=f39e324]:
          - listitem [ref=f39e325]:
            - link "Privacy" [ref=f39e326] [cursor=pointer]:
              - /url: https://www.gov.uk/help/privacy-notice
          - listitem [ref=f39e327]:
            - link "Cookies" [ref=f39e328] [cursor=pointer]:
              - /url: https://www.gov.uk/help/cookies
          - listitem [ref=f39e329]:
            - link "Accessibility statement" [ref=f39e330] [cursor=pointer]:
              - /url: https://www.gov.uk/help/accessibility-statement
        - generic [ref=f39e333]:
          - text: All content is available under the
          - link "Open Government Licence v3.0" [ref=f39e334] [cursor=pointer]:
            - /url: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
          - text: ", except where otherwise stated"
      - link "© Crown copyright" [ref=f39e336] [cursor=pointer]:
        - /url: https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright/
```

# Test source

```ts
  1  | import { test, expect } from '@fixtures';
  2  | import { fileUploadPaths } from '@resources/file-upload/paths';
  3  | import { writePaddedPdf } from '@resources/file-upload/padded-pdf';
  4  | import { DOCUMENT_ISSUE_DATE, MAX_FILE_SIZE_BYTES, OVERSIZE_FILE_MESSAGE } from '@resources/file-upload/constants';
  5  | import { fileUploadTimeouts } from '@config/file-upload-timeouts';
  6  | 
  7  | const maximumDocuments = 15;
  8  | const maximumDocumentsMessage = `You can upload a maximum of ${maximumDocuments} files`;
  9  | 
  10 | test.describe('Documents limits', { tag: '@duplicated-in-frontend' }, () => {
  11 |   test('accepts a fifteenth document and rejects a sixteenth with the maximum-documents error', async ({
  12 |     animalsJourney,
  13 |     pages,
  14 |     animalsPages,
  15 |   }) => {
  16 |     test.setTimeout(120_000);
  17 |     await animalsJourney.toAccompanyingDocuments();
  18 | 
  19 |     for (let index = 1; index <= maximumDocuments; index += 1) {
  20 |       const reference = `PWCAP${Date.now()}${index}`;
  21 |       await animalsPages.accompanyingDocuments.fillDocument(reference, DOCUMENT_ISSUE_DATE, fileUploadPaths.safeFile1kbPdf);
  22 |       await animalsPages.accompanyingDocuments.saveAndAddAnother.click();
  23 |       await expect(animalsPages.accompanyingDocuments.documentRow(reference)).toContainText('Check completed', {
  24 |         timeout: fileUploadTimeouts.virusScanComplete,
  25 |       });
  26 |     }
  27 | 
  28 |     await expect(animalsPages.accompanyingDocuments.addedDocumentRows).toHaveCount(maximumDocuments);
  29 |     await expect(animalsPages.accompanyingDocuments.saveAndAddAnother).toBeVisible();
  30 |     await expect(animalsPages.accompanyingDocuments.errorSummary).toHaveCount(0);
  31 | 
  32 |     const sixteenthReference = `PWCAP${Date.now()}16`;
  33 |     await animalsPages.accompanyingDocuments.fillDocument(sixteenthReference, DOCUMENT_ISSUE_DATE, fileUploadPaths.safeFile1kbPdf);
> 34 |     await animalsPages.accompanyingDocuments.saveAndAddAnother.click();
     |                                                                ^ Error: locator.click: Test timeout of 120000ms exceeded.
  35 | 
  36 |     await expect(pages.page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
  37 |     await expect(pages.page.getByRole('link', { name: maximumDocumentsMessage })).toBeVisible();
  38 |     await expect(animalsPages.accompanyingDocuments.fileFieldError).toHaveCount(0);
  39 |     await expect(animalsPages.accompanyingDocuments.addedDocumentRows).toHaveCount(maximumDocuments);
  40 |     await expect(animalsPages.accompanyingDocuments.documentRow(sixteenthReference)).toHaveCount(0);
  41 |   });
  42 | 
  43 |   test('accepts a PDF at the maximum file size and rejects one a byte over it', async ({
  44 |     animalsJourney,
  45 |     pages,
  46 |     animalsPages,
  47 |   }, testInfo) => {
  48 |     test.slow();
  49 |     const fileAtTheCap = await writePaddedPdf(testInfo.outputPath('boundary-exact.pdf'), MAX_FILE_SIZE_BYTES);
  50 |     const fileOneByteOver = await writePaddedPdf(testInfo.outputPath('boundary-over.pdf'), MAX_FILE_SIZE_BYTES + 1);
  51 |     await animalsJourney.toAccompanyingDocuments();
  52 | 
  53 |     const exactReference = `PWEXACT${Date.now()}`;
  54 |     await animalsPages.accompanyingDocuments.fillDocument(exactReference, DOCUMENT_ISSUE_DATE, fileAtTheCap);
  55 |     await animalsPages.accompanyingDocuments.saveAndAddAnother.click();
  56 | 
  57 |     await expect(animalsPages.accompanyingDocuments.documentRow(exactReference)).toContainText('Check completed', {
  58 |       timeout: fileUploadTimeouts.virusScanComplete,
  59 |     });
  60 |     await expect(animalsPages.accompanyingDocuments.errorSummary).toHaveCount(0);
  61 | 
  62 |     const overReference = `PWOVER${Date.now()}`;
  63 |     await animalsPages.accompanyingDocuments.fillDocument(overReference, DOCUMENT_ISSUE_DATE, fileOneByteOver);
  64 |     await animalsPages.accompanyingDocuments.saveAndAddAnother.click();
  65 | 
  66 |     await expect(pages.page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
  67 |     await expect(pages.page.getByRole('link', { name: OVERSIZE_FILE_MESSAGE })).toBeVisible();
  68 |     await expect(animalsPages.accompanyingDocuments.fileFieldError).toHaveText(`Error: ${OVERSIZE_FILE_MESSAGE}`);
  69 |     await expect(animalsPages.accompanyingDocuments.addedDocumentRows).toHaveCount(1);
  70 |     await expect(animalsPages.accompanyingDocuments.documentRow(overReference)).toHaveCount(0);
  71 |   });
  72 | });
  73 | 
```