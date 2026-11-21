# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: animals/e2e/features/cph-scope.spec.ts >> CPH scope >> a saved CPH number shows as 123456789 on the addresses page, Change pre-fills county, parish and holding, and Back returns to the addresses page, whose Continue reaches check your answers
- Location: tests/animals/e2e/features/cph-scope.spec.ts:29:3

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: getByRole('region', { name: 'County parish holding (CPH) number', exact: true }).locator('.govuk-inset-text')
Timeout: 5000ms
- Expected  - 1
+ Received  + 3

- 123456789
+
+   12/345/6789
+

Call log:
  - Expect "toHaveText" getByRole('region', { name: 'County parish holding (CPH) number', exact: true }).locator('.govuk-inset-text') with timeout 5000ms
  - waiting for getByRole('region', { name: 'County parish holding (CPH) number', exact: true }).locator('.govuk-inset-text')
    14 × locator resolved to <div class="govuk-inset-text">↵  12/345/6789↵</div>
       - unexpected value "
  12/345/6789
"

```

```yaml
- text: 12/345/6789
```

# Test source

```ts
  1  | import { commodityLines } from '@domain/animals/constants/commodity-lines';
  2  | 
  3  | import { test, expect } from '@fixtures';
  4  | 
  5  | test.describe('CPH scope', { tag: '@duplicated-in-frontend' }, () => {
  6  |   test('the CPH page and the CPH section of the addresses page show only when a CPH-triggering commodity line exists', async ({
  7  |     animalsJourney,
  8  |     animalsPages,
  9  |   }) => {
  10 |     test.slow();
  11 | 
  12 |     await animalsJourney.startNotification();
  13 | 
  14 |     const { cphSection, cphLinks } = animalsPages.addresses;
  15 | 
  16 |     await animalsJourney.addCommodityToCurrentNotificationAndFillEveryAnimalCountToOne(commodityLines.domesticCat);
  17 |     await animalsJourney.toRolesAndAddressesOfCurrentNotification();
  18 |     await expect(cphSection).toBeHidden();
  19 |     await animalsPages.addresses.continueButton.click();
  20 |     await expect(animalsPages.notificationView.heading).toBeVisible();
  21 |     await expect(animalsPages.cphNumber.heading).toBeHidden();
  22 | 
  23 |     await animalsJourney.addCommodityToCurrentNotificationAndFillEveryAnimalCountToOne(commodityLines.cattle);
  24 |     await animalsJourney.toRolesAndAddressesOfCurrentNotification();
  25 |     await expect(cphSection).toBeVisible();
  26 |     await expect(cphLinks).toHaveText(['Add a CPH number']);
  27 |   });
  28 | 
  29 |   test('a saved CPH number shows as 123456789 on the addresses page, Change pre-fills county, parish and holding, and Back returns to the addresses page, whose Continue reaches check your answers', async ({
  30 |     animalsJourney,
  31 |     animalsPages,
  32 |   }) => {
  33 |     test.slow();
  34 | 
  35 |     await animalsJourney.startNotification();
  36 | 
  37 |     const { cphLinks, cphNumberText } = animalsPages.addresses;
  38 | 
  39 |     await animalsJourney.addCommodityToCurrentNotificationAndFillEveryAnimalCountToOne(commodityLines.cattle);
  40 |     await animalsJourney.toRolesAndAddressesOfCurrentNotification();
  41 |     await animalsPages.addresses.addCph.click();
  42 |     await expect(animalsPages.cphNumber.heading).toBeVisible();
  43 |     await animalsPages.cphNumber.fillCphNumber();
  44 |     await animalsPages.cphNumber.saveAndContinue.click();
  45 |     await expect(animalsPages.addresses.heading).toBeVisible();
> 46 |     await expect(cphNumberText).toHaveText('123456789');
     |                                 ^ Error: expect(locator).toHaveText(expected) failed
  47 |     await expect(cphLinks).toHaveText([animalsPages.addresses.cphLinkNames.change]);
  48 | 
  49 |     await animalsPages.addresses.changeCph.click();
  50 |     await expect(animalsPages.cphNumber.county).toHaveValue('12');
  51 |     await expect(animalsPages.cphNumber.parish).toHaveValue('345');
  52 |     await expect(animalsPages.cphNumber.holding).toHaveValue('6789');
  53 |     await animalsPages.cphNumber.linkBack.click();
  54 |     await expect(animalsPages.addresses.heading).toBeVisible();
  55 | 
  56 |     await animalsPages.addresses.continueButton.click();
  57 |     await expect(animalsPages.notificationView.heading).toBeVisible();
  58 |     await expect(animalsPages.cphNumber.heading).toBeHidden();
  59 |   });
  60 | });
  61 | 
```