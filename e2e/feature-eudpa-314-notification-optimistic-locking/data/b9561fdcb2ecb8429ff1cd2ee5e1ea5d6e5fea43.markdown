# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/pages/notification-dashboard.spec.ts >> Import notification service dashboard >> notification card actions by status >> copies a submitted notification from its searched dashboard card
- Location: tests/e2e/pages/notification-dashboard.spec.ts:87:5

# Error details

```
Test timeout of 90000ms exceeded.
```

```
Error: locator.waitFor: Test timeout of 90000ms exceeded.
Call log:
  - waiting for getByRole('heading', { name: 'Overview', level: 1 }) to be visible

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=e3]:
    - link "GOV.UK" [ref=e7] [cursor=pointer]:
      - /url: https://www.gov.uk/
      - img "GOV.UK" [ref=e8]
    - region "Service information" [ref=e21]:
      - link "Import notification service" [ref=e25] [cursor=pointer]:
        - /url: /
  - generic [ref=e26]:
    - generic [ref=e29]:
      - generic [ref=e30]:
        - img [ref=e31]
        - generic [ref=e34]: test.user11@defra.gov.uk
      - generic [ref=e35]: "|"
      - link "Sign out" [ref=e36] [cursor=pointer]:
        - /url: /auth/sign-out
    - navigation "Breadcrumb":
      - list
    - main [ref=e37]:
      - generic [ref=e39]:
        - alert "There is a problem" [ref=e40]:
          - heading "There is a problem" [level=2] [ref=e42]
          - paragraph [ref=e44]: Sorry, there is a problem with the service. Your answers on this page have been saved. Try again in a few minutes.
        - heading "Import notification service" [level=1] [ref=e45]
        - paragraph [ref=e46]: Use this service to tell the authorities about live animals you are importing. You will answer a short set of questions about the consignment, then submit your notification.
        - button "Start a new notification" [ref=e48] [cursor=pointer]:
          - text: Start a new notification
          - img [ref=e49]
        - heading "Your notifications" [level=2] [ref=e51]
        - generic [ref=e52]:
          - complementary "Filter notifications" [ref=e54]:
            - heading "Filter notifications" [level=3] [ref=e55]
            - generic [ref=e56]:
              - generic [ref=e57]:
                - generic [ref=e58]: Keyword or reference
                - textbox "Keyword or reference" [ref=e59]
              - button "Search" [ref=e60] [cursor=pointer]
          - generic [ref=e61]:
            - generic [ref=e62]:
              - paragraph [ref=e63]: Showing 1 to 10 of 10 Results
              - generic [ref=e64]:
                - generic [ref=e65]:
                  - generic [ref=e66]: Sort by
                  - combobox "Sort by" [ref=e67]:
                    - option "Arrival (newest to oldest)" [selected]
                    - option "Arrival (oldest to newest)"
                    - option "Date created (newest to oldest)"
                    - option "Date created (oldest to newest)"
                - button "Update sort" [ref=e68] [cursor=pointer]
            - generic [ref=e69]:
              - generic [ref=e70]:
                - heading "GBN-AG-26-2HJFW0" [level=3] [ref=e71]
                - list [ref=e72]:
                  - listitem [ref=e73]:
                    - link "View notification GBN-AG-26-2HJFW0" [ref=e74] [cursor=pointer]:
                      - /url: /notifications/GBN-AG-26-2HJFW0/notification-view
                      - text: View
                      - generic [ref=e75]: notification GBN-AG-26-2HJFW0
                  - listitem [ref=e76]:
                    - button "Amend notification GBN-AG-26-2HJFW0" [ref=e78] [cursor=pointer]:
                      - text: Amend
                      - generic [ref=e79]: notification GBN-AG-26-2HJFW0
                  - listitem [ref=e80]:
                    - button "Copy as new notification GBN-AG-26-2HJFW0" [ref=e82] [cursor=pointer]:
                      - text: Copy as new
                      - generic [ref=e83]: notification GBN-AG-26-2HJFW0
                  - listitem [ref=e84]:
                    - link "Delete notification GBN-AG-26-2HJFW0" [ref=e85] [cursor=pointer]:
                      - /url: /notifications/GBN-AG-26-2HJFW0/delete
                      - text: Delete
                      - generic [ref=e86]: notification GBN-AG-26-2HJFW0
              - generic [ref=e87]:
                - generic [ref=e88]:
                  - generic [ref=e89]:
                    - term [ref=e90]: Commodity
                    - definition [ref=e91]: Cow
                  - generic [ref=e92]:
                    - term [ref=e93]: Origin
                    - definition [ref=e94]: France
                  - generic [ref=e95]:
                    - term [ref=e96]: Arrival at destination
                    - definition [ref=e97]: 18 Sep 2026
                - generic [ref=e98]:
                  - generic [ref=e99]:
                    - term [ref=e100]: Consignee
                    - definition [ref=e101]: British Livestock Ltd
                  - generic [ref=e102]:
                    - term [ref=e103]: Consignor
                    - definition [ref=e104]: Astra Rosales
                  - generic [ref=e105]:
                    - term [ref=e106]: Status
                    - definition [ref=e107]:
                      - strong [ref=e108]: Submitted
                - generic [ref=e109]:
                  - generic [ref=e110]:
                    - term [ref=e111]: Date created
                    - definition [ref=e112]: 18 Aug 2026
                  - generic [ref=e113]:
                    - term [ref=e114]: Date submitted
                    - definition
            - generic [ref=e115]:
              - generic [ref=e116]:
                - heading "GBN-AG-26-2DYBSG" [level=3] [ref=e117]
                - list [ref=e118]:
                  - listitem [ref=e119]:
                    - link "View notification GBN-AG-26-2DYBSG" [ref=e120] [cursor=pointer]:
                      - /url: /notifications/GBN-AG-26-2DYBSG/notification-view
                      - text: View
                      - generic [ref=e121]: notification GBN-AG-26-2DYBSG
                  - listitem [ref=e122]:
                    - button "Amend notification GBN-AG-26-2DYBSG" [ref=e124] [cursor=pointer]:
                      - text: Amend
                      - generic [ref=e125]: notification GBN-AG-26-2DYBSG
                  - listitem [ref=e126]:
                    - button "Copy as new notification GBN-AG-26-2DYBSG" [ref=e128] [cursor=pointer]:
                      - text: Copy as new
                      - generic [ref=e129]: notification GBN-AG-26-2DYBSG
                  - listitem [ref=e130]:
                    - link "Delete notification GBN-AG-26-2DYBSG" [ref=e131] [cursor=pointer]:
                      - /url: /notifications/GBN-AG-26-2DYBSG/delete
                      - text: Delete
                      - generic [ref=e132]: notification GBN-AG-26-2DYBSG
              - generic [ref=e133]:
                - generic [ref=e134]:
                  - generic [ref=e135]:
                    - term [ref=e136]: Commodity
                    - definition
                  - generic [ref=e137]:
                    - term [ref=e138]: Origin
                    - definition
                  - generic [ref=e139]:
                    - term [ref=e140]: Arrival at destination
                    - definition
                - generic [ref=e141]:
                  - generic [ref=e142]:
                    - term [ref=e143]: Consignee
                    - definition
                  - generic [ref=e144]:
                    - term [ref=e145]: Consignor
                    - definition
                  - generic [ref=e146]:
                    - term [ref=e147]: Status
                    - definition [ref=e148]:
                      - strong [ref=e149]: Submitted
                - generic [ref=e150]:
                  - generic [ref=e151]:
                    - term [ref=e152]: Date created
                    - definition [ref=e153]: 18 Aug 2026
                  - generic [ref=e154]:
                    - term [ref=e155]: Date submitted
                    - definition
            - generic [ref=e156]:
              - generic [ref=e157]:
                - heading "GBN-AG-26-ZSE83P" [level=3] [ref=e158]
                - list [ref=e159]:
                  - listitem [ref=e160]:
                    - link "Resume notification GBN-AG-26-ZSE83P" [ref=e161] [cursor=pointer]:
                      - /url: /notifications/GBN-AG-26-ZSE83P
                      - text: Resume
                      - generic [ref=e162]: notification GBN-AG-26-ZSE83P
                  - listitem [ref=e163]:
                    - button "Copy as new notification GBN-AG-26-ZSE83P" [ref=e165] [cursor=pointer]:
                      - text: Copy as new
                      - generic [ref=e166]: notification GBN-AG-26-ZSE83P
                  - listitem [ref=e167]:
                    - link "Delete notification GBN-AG-26-ZSE83P" [ref=e168] [cursor=pointer]:
                      - /url: /notifications/GBN-AG-26-ZSE83P/delete
                      - text: Delete
                      - generic [ref=e169]: notification GBN-AG-26-ZSE83P
              - generic [ref=e170]:
                - generic [ref=e171]:
                  - generic [ref=e172]:
                    - term [ref=e173]: Commodity
                    - definition
                  - generic [ref=e174]:
                    - term [ref=e175]: Origin
                    - definition
                  - generic [ref=e176]:
                    - term [ref=e177]: Arrival at destination
                    - definition
                - generic [ref=e178]:
                  - generic [ref=e179]:
                    - term [ref=e180]: Consignee
                    - definition
                  - generic [ref=e181]:
                    - term [ref=e182]: Consignor
                    - definition
                  - generic [ref=e183]:
                    - term [ref=e184]: Status
                    - definition [ref=e185]:
                      - strong [ref=e186]: Draft
                - generic [ref=e187]:
                  - generic [ref=e188]:
                    - term [ref=e189]: Date created
                    - definition [ref=e190]: 18 Aug 2026
                  - generic [ref=e191]:
                    - term [ref=e192]: Date submitted
                    - definition
            - generic [ref=e193]:
              - generic [ref=e194]:
                - heading "GBN-AG-26-90VCBQ" [level=3] [ref=e195]
                - list [ref=e196]:
                  - listitem [ref=e197]:
                    - link "Resume notification GBN-AG-26-90VCBQ" [ref=e198] [cursor=pointer]:
                      - /url: /notifications/GBN-AG-26-90VCBQ
                      - text: Resume
                      - generic [ref=e199]: notification GBN-AG-26-90VCBQ
                  - listitem [ref=e200]:
                    - button "Copy as new notification GBN-AG-26-90VCBQ" [ref=e202] [cursor=pointer]:
                      - text: Copy as new
                      - generic [ref=e203]: notification GBN-AG-26-90VCBQ
                  - listitem [ref=e204]:
                    - link "Delete notification GBN-AG-26-90VCBQ" [ref=e205] [cursor=pointer]:
                      - /url: /notifications/GBN-AG-26-90VCBQ/delete
                      - text: Delete
                      - generic [ref=e206]: notification GBN-AG-26-90VCBQ
              - generic [ref=e207]:
                - generic [ref=e208]:
                  - generic [ref=e209]:
                    - term [ref=e210]: Commodity
                    - definition
                  - generic [ref=e211]:
                    - term [ref=e212]: Origin
                    - definition
                  - generic [ref=e213]:
                    - term [ref=e214]: Arrival at destination
                    - definition
                - generic [ref=e215]:
                  - generic [ref=e216]:
                    - term [ref=e217]: Consignee
                    - definition
                  - generic [ref=e218]:
                    - term [ref=e219]: Consignor
                    - definition
                  - generic [ref=e220]:
                    - term [ref=e221]: Status
                    - definition [ref=e222]:
                      - strong [ref=e223]: Draft
                - generic [ref=e224]:
                  - generic [ref=e225]:
                    - term [ref=e226]: Date created
                    - definition [ref=e227]: 18 Aug 2026
                  - generic [ref=e228]:
                    - term [ref=e229]: Date submitted
                    - definition
            - generic [ref=e230]:
              - generic [ref=e231]:
                - heading "GBN-AG-26-HKR2Z2" [level=3] [ref=e232]
                - list [ref=e233]:
                  - listitem [ref=e234]:
                    - link "Resume notification GBN-AG-26-HKR2Z2" [ref=e235] [cursor=pointer]:
                      - /url: /notifications/GBN-AG-26-HKR2Z2
                      - text: Resume
                      - generic [ref=e236]: notification GBN-AG-26-HKR2Z2
                  - listitem [ref=e237]:
                    - button "Copy as new notification GBN-AG-26-HKR2Z2" [ref=e239] [cursor=pointer]:
                      - text: Copy as new
                      - generic [ref=e240]: notification GBN-AG-26-HKR2Z2
                  - listitem [ref=e241]:
                    - link "Delete notification GBN-AG-26-HKR2Z2" [ref=e242] [cursor=pointer]:
                      - /url: /notifications/GBN-AG-26-HKR2Z2/delete
                      - text: Delete
                      - generic [ref=e243]: notification GBN-AG-26-HKR2Z2
              - generic [ref=e244]:
                - generic [ref=e245]:
                  - generic [ref=e246]:
                    - term [ref=e247]: Commodity
                    - definition
                  - generic [ref=e248]:
                    - term [ref=e249]: Origin
                    - definition
                  - generic [ref=e250]:
                    - term [ref=e251]: Arrival at destination
                    - definition
                - generic [ref=e252]:
                  - generic [ref=e253]:
                    - term [ref=e254]: Consignee
                    - definition
                  - generic [ref=e255]:
                    - term [ref=e256]: Consignor
                    - definition
                  - generic [ref=e257]:
                    - term [ref=e258]: Status
                    - definition [ref=e259]:
                      - strong [ref=e260]: Draft
                - generic [ref=e261]:
                  - generic [ref=e262]:
                    - term [ref=e263]: Date created
                    - definition [ref=e264]: 18 Aug 2026
                  - generic [ref=e265]:
                    - term [ref=e266]: Date submitted
                    - definition
            - generic [ref=e267]:
              - generic [ref=e268]:
                - heading "GBN-AG-26-WXA279" [level=3] [ref=e269]
                - list [ref=e270]:
                  - listitem [ref=e271]:
                    - link "Resume notification GBN-AG-26-WXA279" [ref=e272] [cursor=pointer]:
                      - /url: /notifications/GBN-AG-26-WXA279
                      - text: Resume
                      - generic [ref=e273]: notification GBN-AG-26-WXA279
                  - listitem [ref=e274]:
                    - button "Copy as new notification GBN-AG-26-WXA279" [ref=e276] [cursor=pointer]:
                      - text: Copy as new
                      - generic [ref=e277]: notification GBN-AG-26-WXA279
                  - listitem [ref=e278]:
                    - link "Delete notification GBN-AG-26-WXA279" [ref=e279] [cursor=pointer]:
                      - /url: /notifications/GBN-AG-26-WXA279/delete
                      - text: Delete
                      - generic [ref=e280]: notification GBN-AG-26-WXA279
              - generic [ref=e281]:
                - generic [ref=e282]:
                  - generic [ref=e283]:
                    - term [ref=e284]: Commodity
                    - definition
                  - generic [ref=e285]:
                    - term [ref=e286]: Origin
                    - definition
                  - generic [ref=e287]:
                    - term [ref=e288]: Arrival at destination
                    - definition
                - generic [ref=e289]:
                  - generic [ref=e290]:
                    - term [ref=e291]: Consignee
                    - definition
                  - generic [ref=e292]:
                    - term [ref=e293]: Consignor
                    - definition
                  - generic [ref=e294]:
                    - term [ref=e295]: Status
                    - definition [ref=e296]:
                      - strong [ref=e297]: Draft
                - generic [ref=e298]:
                  - generic [ref=e299]:
                    - term [ref=e300]: Date created
                    - definition [ref=e301]: 18 Aug 2026
                  - generic [ref=e302]:
                    - term [ref=e303]: Date submitted
                    - definition
            - generic [ref=e304]:
              - generic [ref=e305]:
                - heading "GBN-AG-26-SD47XP" [level=3] [ref=e306]
                - list [ref=e307]:
                  - listitem [ref=e308]:
                    - link "Resume notification GBN-AG-26-SD47XP" [ref=e309] [cursor=pointer]:
                      - /url: /notifications/GBN-AG-26-SD47XP
                      - text: Resume
                      - generic [ref=e310]: notification GBN-AG-26-SD47XP
                  - listitem [ref=e311]:
                    - button "Copy as new notification GBN-AG-26-SD47XP" [ref=e313] [cursor=pointer]:
                      - text: Copy as new
                      - generic [ref=e314]: notification GBN-AG-26-SD47XP
                  - listitem [ref=e315]:
                    - link "Delete notification GBN-AG-26-SD47XP" [ref=e316] [cursor=pointer]:
                      - /url: /notifications/GBN-AG-26-SD47XP/delete
                      - text: Delete
                      - generic [ref=e317]: notification GBN-AG-26-SD47XP
              - generic [ref=e318]:
                - generic [ref=e319]:
                  - generic [ref=e320]:
                    - term [ref=e321]: Commodity
                    - definition
                  - generic [ref=e322]:
                    - term [ref=e323]: Origin
                    - definition
                  - generic [ref=e324]:
                    - term [ref=e325]: Arrival at destination
                    - definition
                - generic [ref=e326]:
                  - generic [ref=e327]:
                    - term [ref=e328]: Consignee
                    - definition
                  - generic [ref=e329]:
                    - term [ref=e330]: Consignor
                    - definition
                  - generic [ref=e331]:
                    - term [ref=e332]: Status
                    - definition [ref=e333]:
                      - strong [ref=e334]: Draft
                - generic [ref=e335]:
                  - generic [ref=e336]:
                    - term [ref=e337]: Date created
                    - definition [ref=e338]: 18 Aug 2026
                  - generic [ref=e339]:
                    - term [ref=e340]: Date submitted
                    - definition
            - generic [ref=e341]:
              - generic [ref=e342]:
                - heading "GBN-AG-26-ATCTJ2" [level=3] [ref=e343]
                - list [ref=e344]:
                  - listitem [ref=e345]:
                    - link "View notification GBN-AG-26-ATCTJ2" [ref=e346] [cursor=pointer]:
                      - /url: /notifications/GBN-AG-26-ATCTJ2/notification-view
                      - text: View
                      - generic [ref=e347]: notification GBN-AG-26-ATCTJ2
                  - listitem [ref=e348]:
                    - button "Amend notification GBN-AG-26-ATCTJ2" [ref=e350] [cursor=pointer]:
                      - text: Amend
                      - generic [ref=e351]: notification GBN-AG-26-ATCTJ2
                  - listitem [ref=e352]:
                    - button "Copy as new notification GBN-AG-26-ATCTJ2" [ref=e354] [cursor=pointer]:
                      - text: Copy as new
                      - generic [ref=e355]: notification GBN-AG-26-ATCTJ2
                  - listitem [ref=e356]:
                    - link "Delete notification GBN-AG-26-ATCTJ2" [ref=e357] [cursor=pointer]:
                      - /url: /notifications/GBN-AG-26-ATCTJ2/delete
                      - text: Delete
                      - generic [ref=e358]: notification GBN-AG-26-ATCTJ2
              - generic [ref=e359]:
                - generic [ref=e360]:
                  - generic [ref=e361]:
                    - term [ref=e362]: Commodity
                    - definition
                  - generic [ref=e363]:
                    - term [ref=e364]: Origin
                    - definition
                  - generic [ref=e365]:
                    - term [ref=e366]: Arrival at destination
                    - definition
                - generic [ref=e367]:
                  - generic [ref=e368]:
                    - term [ref=e369]: Consignee
                    - definition
                  - generic [ref=e370]:
                    - term [ref=e371]: Consignor
                    - definition
                  - generic [ref=e372]:
                    - term [ref=e373]: Status
                    - definition [ref=e374]:
                      - strong [ref=e375]: Submitted
                - generic [ref=e376]:
                  - generic [ref=e377]:
                    - term [ref=e378]: Date created
                    - definition [ref=e379]: 18 Aug 2026
                  - generic [ref=e380]:
                    - term [ref=e381]: Date submitted
                    - definition
            - generic [ref=e382]:
              - generic [ref=e383]:
                - heading "GBN-AG-26-CPC2EC" [level=3] [ref=e384]
                - list [ref=e385]:
                  - listitem [ref=e386]:
                    - link "View notification GBN-AG-26-CPC2EC" [ref=e387] [cursor=pointer]:
                      - /url: /notifications/GBN-AG-26-CPC2EC/notification-view
                      - text: View
                      - generic [ref=e388]: notification GBN-AG-26-CPC2EC
                  - listitem [ref=e389]:
                    - button "Amend notification GBN-AG-26-CPC2EC" [ref=e391] [cursor=pointer]:
                      - text: Amend
                      - generic [ref=e392]: notification GBN-AG-26-CPC2EC
                  - listitem [ref=e393]:
                    - button "Copy as new notification GBN-AG-26-CPC2EC" [ref=e395] [cursor=pointer]:
                      - text: Copy as new
                      - generic [ref=e396]: notification GBN-AG-26-CPC2EC
                  - listitem [ref=e397]:
                    - link "Delete notification GBN-AG-26-CPC2EC" [ref=e398] [cursor=pointer]:
                      - /url: /notifications/GBN-AG-26-CPC2EC/delete
                      - text: Delete
                      - generic [ref=e399]: notification GBN-AG-26-CPC2EC
              - generic [ref=e400]:
                - generic [ref=e401]:
                  - generic [ref=e402]:
                    - term [ref=e403]: Commodity
                    - definition
                  - generic [ref=e404]:
                    - term [ref=e405]: Origin
                    - definition
                  - generic [ref=e406]:
                    - term [ref=e407]: Arrival at destination
                    - definition
                - generic [ref=e408]:
                  - generic [ref=e409]:
                    - term [ref=e410]: Consignee
                    - definition
                  - generic [ref=e411]:
                    - term [ref=e412]: Consignor
                    - definition
                  - generic [ref=e413]:
                    - term [ref=e414]: Status
                    - definition [ref=e415]:
                      - strong [ref=e416]: Submitted
                - generic [ref=e417]:
                  - generic [ref=e418]:
                    - term [ref=e419]: Date created
                    - definition [ref=e420]: 18 Aug 2026
                  - generic [ref=e421]:
                    - term [ref=e422]: Date submitted
                    - definition
            - generic [ref=e423]:
              - generic [ref=e424]:
                - heading "GBN-AG-26-Z7RYNQ" [level=3] [ref=e425]
                - list [ref=e426]:
                  - listitem [ref=e427]:
                    - link "View notification GBN-AG-26-Z7RYNQ" [ref=e428] [cursor=pointer]:
                      - /url: /notifications/GBN-AG-26-Z7RYNQ/notification-view
                      - text: View
                      - generic [ref=e429]: notification GBN-AG-26-Z7RYNQ
                  - listitem [ref=e430]:
                    - button "Amend notification GBN-AG-26-Z7RYNQ" [ref=e432] [cursor=pointer]:
                      - text: Amend
                      - generic [ref=e433]: notification GBN-AG-26-Z7RYNQ
                  - listitem [ref=e434]:
                    - button "Copy as new notification GBN-AG-26-Z7RYNQ" [ref=e436] [cursor=pointer]:
                      - text: Copy as new
                      - generic [ref=e437]: notification GBN-AG-26-Z7RYNQ
                  - listitem [ref=e438]:
                    - link "Delete notification GBN-AG-26-Z7RYNQ" [ref=e439] [cursor=pointer]:
                      - /url: /notifications/GBN-AG-26-Z7RYNQ/delete
                      - text: Delete
                      - generic [ref=e440]: notification GBN-AG-26-Z7RYNQ
              - generic [ref=e441]:
                - generic [ref=e442]:
                  - generic [ref=e443]:
                    - term [ref=e444]: Commodity
                    - definition
                  - generic [ref=e445]:
                    - term [ref=e446]: Origin
                    - definition
                  - generic [ref=e447]:
                    - term [ref=e448]: Arrival at destination
                    - definition
                - generic [ref=e449]:
                  - generic [ref=e450]:
                    - term [ref=e451]: Consignee
                    - definition
                  - generic [ref=e452]:
                    - term [ref=e453]: Consignor
                    - definition
                  - generic [ref=e454]:
                    - term [ref=e455]: Status
                    - definition [ref=e456]:
                      - strong [ref=e457]: Submitted
                - generic [ref=e458]:
                  - generic [ref=e459]:
                    - term [ref=e460]: Date created
                    - definition [ref=e461]: 18 Aug 2026
                  - generic [ref=e462]:
                    - term [ref=e463]: Date submitted
                    - definition
  - contentinfo [ref=e464]:
    - generic [ref=e477]:
      - generic [ref=e478]:
        - heading "Support links" [level=2] [ref=e479]
        - list [ref=e480]:
          - listitem [ref=e481]:
            - link "Privacy" [ref=e482] [cursor=pointer]:
              - /url: https://www.gov.uk/help/privacy-notice
          - listitem [ref=e483]:
            - link "Cookies" [ref=e484] [cursor=pointer]:
              - /url: https://www.gov.uk/help/cookies
          - listitem [ref=e485]:
            - link "Accessibility statement" [ref=e486] [cursor=pointer]:
              - /url: https://www.gov.uk/help/accessibility-statement
        - img [ref=e487]
        - generic [ref=e489]:
          - text: All content is available under the
          - link "Open Government Licence v3.0" [ref=e490] [cursor=pointer]:
            - /url: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
          - text: ", except where otherwise stated"
      - link "© Crown copyright" [ref=e492] [cursor=pointer]:
        - /url: https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright/
```

# Test source

```ts
  1   | import { test, expect } from '@fixtures';
  2   | 
  3   | test.describe('Import notification service dashboard', { tag: '@integration' }, () => {
  4   |   test('starts a journey at the origin page and lists the draft', async ({ journey, pages }) => {
  5   |     const journeyId = await journey.startNotification();
  6   | 
  7   |     await expect(pages.page).toHaveURL(new RegExp(`/notifications/${journeyId}$`));
  8   |     await expect(pages.overview.heading).toBeVisible();
  9   | 
  10  |     const card = pages.notificationDashboard.notificationCard(journeyId);
  11  |     await expect(async () => {
  12  |       await pages.notificationDashboard.open();
  13  |       await pages.notificationDashboard.searchForReference(journeyId);
  14  |       await expect(card).toBeVisible({ timeout: 2_000 });
  15  |     }).toPass({ timeout: 15_000 });
  16  |     await expect(card.getByText('Draft', { exact: true })).toBeVisible();
  17  |     await expect(pages.notificationDashboard.resume(journeyId)).toBeVisible();
  18  |     await expect(pages.notificationDashboard.copyAsNew(journeyId)).toBeVisible();
  19  |     await expect(pages.notificationDashboard.delete(journeyId)).toBeVisible();
  20  |   });
  21  | 
  22  |   test.describe('dashboard basics', () => {
  23  |     test('lands on the notification dashboard', { tag: '@smoke' }, async ({ journey, pages }) => {
  24  |       await journey.toNotificationDashboard();
  25  |       await expect(pages.page).toHaveURL(pages.notificationDashboard.expectedUrl);
  26  |       await expect(pages.notificationDashboard.heading).toBeVisible();
  27  |     });
  28  | 
  29  |     test('allows creating a new notification, landing on the journey entry page', async ({ journey, pages }) => {
  30  |       await journey.toNotificationDashboard();
  31  |       await pages.notificationDashboard.btnCreateNewNotification.click();
  32  |       await expect(pages.originOfImport.heading).toBeVisible();
  33  |     });
  34  | 
  35  |     test('displays the notification list and result count', async ({ apiJourney, pages }) => {
  36  |       const created = await apiJourney.createFullNotification();
  37  |       await pages.notificationDashboard.open();
  38  |       await pages.notificationDashboard.searchForReference(created.referenceNumber);
  39  | 
  40  |       await expect(pages.notificationDashboard.heading).toBeVisible();
  41  |       await expect(pages.notificationDashboard.totalResults).toBeVisible();
  42  |       await expect(pages.notificationDashboard.notificationCards).toHaveCount(1);
  43  |     });
  44  | 
  45  |     test('displays details on a notification card', async ({ journey, journeyContext, pages }) => {
  46  |       test.slow();
  47  |       await journey.submitNotification();
  48  |       await pages.notificationDashboard.open();
  49  |       await pages.notificationDashboard.searchForReference(journeyContext.journeyId);
  50  | 
  51  |       const details = pages.notificationDashboard.notificationCardDetails(0);
  52  |       await expect(details.heading).toContainText(journeyContext.journeyId);
  53  |       await expect(details.commodity).toBeVisible();
  54  |       await expect(details.origin).toBeVisible();
  55  |       await expect(details.arrivalAtDestination).toContainText(/\d{1,2} \w+ \d{4}/);
  56  |       await expect(details.status).toContainText('Submitted');
  57  |       await expect(details.dateCreated).toHaveText(/\d{1,2} \w+ \d{4}/);
  58  |     });
  59  |   });
  60  | 
  61  |   test.describe('notification card actions by status', () => {
  62  |     test('shows resume, copy and delete actions for a draft notification', async ({ pages, apiJourney }) => {
  63  |       const created = await apiJourney.createFullNotification();
  64  |       const referenceNumber = created.referenceNumber;
  65  | 
  66  |       await pages.notificationDashboard.open();
  67  |       await pages.notificationDashboard.searchForReference(referenceNumber);
  68  |       await expect(pages.notificationDashboard.notificationCardDetails(0).status).toContainText('Draft');
  69  |       await expect(pages.notificationDashboard.resume(referenceNumber)).toBeVisible();
  70  |       await expect(pages.notificationDashboard.copyAsNew(referenceNumber)).toBeVisible();
  71  |       await expect(pages.notificationDashboard.delete(referenceNumber)).toBeVisible();
  72  |       await expect(pages.notificationDashboard.amend(referenceNumber)).not.toBeVisible();
  73  |     });
  74  | 
  75  |     test('shows view, copy and amend actions for a submitted notification', async ({ pages, apiJourney }) => {
  76  |       const created = await apiJourney.createSubmittedNotification();
  77  |       const referenceNumber = created.referenceNumber;
  78  | 
  79  |       await pages.notificationDashboard.open();
  80  |       await pages.notificationDashboard.searchForReference(referenceNumber);
  81  |       await expect(pages.notificationDashboard.notificationCardDetails(0).status).toContainText('Submitted');
  82  |       await expect(pages.notificationDashboard.view(referenceNumber)).toBeVisible();
  83  |       await expect(pages.notificationDashboard.copyAsNew(referenceNumber)).toBeVisible();
  84  |       await expect(pages.notificationDashboard.amend(referenceNumber)).toBeVisible();
  85  |     });
  86  | 
  87  |     test(
  88  |       'copies a submitted notification from its searched dashboard card',
  89  |       { tag: '@smoke' },
  90  |       async ({ pages, journey, journeyContext }) => {
  91  |         test.slow();
  92  |         await journey.submitNotification();
  93  |         const originalReferenceNumber = journeyContext.journeyId;
  94  | 
  95  |         await pages.notificationDashboard.open();
  96  |         await pages.notificationDashboard.searchForReference(originalReferenceNumber);
  97  |         await pages.notificationDashboard.copyAsNew(originalReferenceNumber).click();
  98  | 
> 99  |         await pages.overview.heading.waitFor();
      |                                      ^ Error: locator.waitFor: Test timeout of 90000ms exceeded.
  100 |         const copiedReferenceNumber = (await pages.notificationView.referenceNumberCaption.textContent())?.match(
  101 |           /GBN-AG-\d{2}-[0-9A-Z]{6}/,
  102 |         )?.[0];
  103 |         expect(copiedReferenceNumber).toMatch(/^GBN-AG-\d{2}-[0-9A-Z]{6}$/);
  104 |         expect(copiedReferenceNumber).not.toEqual(originalReferenceNumber);
  105 |       },
  106 |     );
  107 |   });
  108 | });
  109 | 
```