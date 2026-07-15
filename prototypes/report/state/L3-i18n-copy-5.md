# L3 — Adversarial verification — C5 (i18n-copy)

**Claim under test:** B's i18n is materially weaker than *B's own documentation claims*, in
four checkable ways: (a) no Welsh; (b) no pluralisation; (c) the coverage gate has drifted;
(d) obligations.md:2749's "code doubles as the message key" is false.

**VERDICT: AMENDED.** Two of the four sub-claims (c and d) survive contact with the source —
(c) is exactly right, and I independently reconstructed its 18-key figure. But (a) and (b)
each contain a load-bearing falsehood, and the *umbrella framing* ("weaker than B's own
documentation claims") is refuted for (a): B's docs say plainly that Welsh is not done.

---

## (a) NO WELSH — **AMENDED. Facts true; framing and the key inference are false.**

**What survives.** Verified at the cited lines:
- `lib/i18n.js:24-27` — `const en = JSON.parse(readFileSync(…'en.json'…))` at module scope. Real.
- `lib/i18n.js:47`, `:61` — `t(key, params)` / `tOrNull(key, params)`. No locale param. Real.
- No `cy.json`. `find … -iname "*.json" -path "*locale*"` over all of `prototypes/` returns
  exactly one file: `locales/en.json`. Confirmed. I also swept B's *other* spike
  (`prototypes/model-spikes/obligations-v4-model/`) for a locale mechanism — the only hit for
  `i18n|locale|readFileSync` is prose in `obligations.md`. No hidden counter-example.

**Falsehood 1 — "none of the ~93 t() call sites has a request in scope."** Refuted directly:

    features/units/controller.js:226   handler(request, h) {
    features/units/controller.js:244-261   t('units.pageTitle', …) … t('units.breadcrumbSelf', …)

Thirteen of that file's fifteen `t()` calls sit lexically inside `handler(request, h)`.
`request` is right there. Same shape in `features/hub/controller.js`, `check-your-answers/
controller.js`, `commodity-lines/controller.js`. The claim's most architectural-sounding
sentence is simply not what the source shows.

**Falsehood 2 — the framing.** The claim's thesis is that B's *docs oversell* its i18n. For
Welsh, B's docs do the opposite — they flag the gap in three separate places:
- `lib/i18n.js:6-8` — "a translator working on Welsh support will add a sibling `cy.json` and
  this file will thread locale through — see NEXT.md P0.5."
- `lib/chrome.js:35-37` — "Currently English-only; when locale threading lands … this gains a
  `request` argument."
- `NEXT.md:1152` — "**P0.5. Spike-wide multi-language (Welsh) support — IN PROGRESS**";
  `:1207-1211` — "⏳ Locale threading … ⏳ Add `locales/cy.json`."

B claims Welsh is *planned*, not *done*. "No Welsh" is true, but it is not a doc-vs-code
discrepancy, and it cannot be filed under "weaker than its own documentation claims."

**The counter-example that matters (conflating "not built" with "cannot be built").** I went
looking for module-scope *resolved* copy — the thing that would make locale threading
structurally expensive — and **there is none**:
- `flow/flow.js` — **0** `t('` calls. It stores `titleKey` / `errors.required` as *keys*.
- `lib/presentation.js` — **0** `t('` calls. `OBLIGATION_KEYS` / `PAGE_KEYS` store
  `pageTitleKey`, `legendKey`, `hintKey`, `leadKey` — *keys*.
- Every `t()` call in B is inside a per-request or per-render function: controller handlers,
  `chrome()`, `page-controller` / `line-page-controller` / `unit-page-controller`,
  `field-widgets`, `format-domain-errors` dispatchers.

B's copy layer is **late-binding by construction**. Nothing is baked at import. Threading a
locale is a param-drill through ~5 helper signatures plus a `cy.json` — mechanical, and B's
own `chrome.js:35-37` names the exact edit. That is the opposite of a structural limitation,
and the claim as written invites the reader to infer one.

## (b) NO PLURALISATION — **AMENDED. Mechanism true; the smoking gun is fabricated.**

**True:** `lib/i18n.js:69-75` — `interpolate()` is a 7-line `template.replace(/\{(\w+)\}/g, …)`.
No plural categories, no ICU, no `count` handling. Confirmed.

**False:** "shipped copy reads 'Select no more than 1 items'". `en.json:575` actually reads:

    "arrayMaxSelections": "Select no more than {max} items (you selected {actual})"

— a *template*. And the only site that raises that code hardcodes the bound:
`domain/index.js:1092` `max: 12`, `:1104` `max: 12`. So the string that ships is "Select no
more than 12 items", which is grammatical. `grep -rn "1 items"` over the **entire spike**
returns **zero hits** — not in copy, not in a test, not in a fixture. The defect quoted as
evidence does not exist. I checked the other count-bearing strings too (`stringMaxLength`
"{max} characters", `integerMaxDigits` "{maxDigits} digits") — all bound to lengths/limits
that cannot realistically be 1.

The honest version is a *latent* gap, not a live bug: B has no plural machinery, so the first
message whose count can be 1 will read wrong, and Welsh (which has more plural categories than
English, not fewer) cannot be done properly on a regex-replace. That is a real finding. It is
not "shipped broken copy".

## (c) THE GATE HAS DRIFTED — **CONFIRMED, and more precisely than the claim states.**

Everything checks out, and I reconstructed the 18 independently rather than taking it on trust.
`i18n-coverage.test.js:37-76` — hand-typed `HUB_KEYS` / `CYA_KEYS` / `COMMODITY_LINES_KEYS`
with the comment *"Keep in sync with the `t()` calls in those files"* (`:33-34`). The six
`describe` blocks walk `flow.*`, `presentation.*`, domain labels, address sub-fields,
`FORMAT_ERROR_KEYS`, `CHROME_KEYS` + those three arrays. **No `UNITS_KEYS` exists**, and no
walk touches the `units.*` namespace. Used-but-ungated keys:

| Keys | Where used | Why ungated |
|---|---|---|
| all 13 `units.*` (`en.json:507-520`) | `features/units/controller.js` (15 `t()` calls) | no `UNITS_KEYS`, no walk covers `units.*` |
| `cya.promptCompleteAddressForUnit`, `cya.promptCompleteAddress`, `cya.promptGroupInvariant` | `check-your-answers/controller.js:171, 291, 324` | absent from `CYA_KEYS` |
| `commodityLines.manageAnimalsButton` | `commodity-lines/controller.js:172` | absent from `COMMODITY_LINES_KEYS` |
| `hub.status.optional` | `hub/controller.js:37` | absent from `HUB_KEYS` |

13 + 3 + 1 + 1 = **18**. The claim's figure is exactly right.

**And the no-orphan-check point has a live specimen the claim missed.**
`errors.domain.addressSubFieldRequired` (`en.json:576`) is **dead**: its dispatcher was retired
(`format-domain-errors.js:48-53` — "`addressSubFieldRequired` was retired when the addressBlock
predicate switched to interpretation A"), it is absent from `FORMAT_ERROR_KEYS`, and nothing
references it. It sits in the catalogue and no test complains. Concrete proof of the missing
orphan gate.

## (d) obligations.md:2749 — **AMENDED. Right conclusion, wrong target, wrong arithmetic.**

**The doc says what the claim says it says.** `obligations.md:2749-2752`, in §J *"Where authored
reasons are authored (settled)"*: *"**The code** follows a dot-separated naming convention and
doubles as the i18n message key."* And `:2756-2757` extends it: *"The Domain-layer reasons
follow the same convention."*

**The code does not honour it — but not for the reason given.** The claim aims at
`format-domain-errors.js` alone. The real finding is broader: **no error or reason code in B is
ever passed to `t()`, anywhere.**
- *Domain* codes: `domain/index.js:80-83` declares `code: 'domain.string.maxLength'`; the
  message key is `errors.domain.stringMaxLength` (`en.json:570`). A hand-maintained dispatcher
  bridges them. So the code demonstrably does *not* double as the key.
- *Evaluator reason* codes (§J's actual subject — `obligations.js:195, 221, 287, 301, 343, 516,
  552, 759`): `grep -rn "reason"` over `features/`, `lib/`, `shared/`, `engine/` finds **zero**
  read sites. They are never rendered at all. The documented convention isn't wrong so much as
  **never exercised**.

**Arithmetic wrong.** `format-domain-errors.js:21-68` is a **10**-entry dispatcher (lines 22,
32, 37, 39, 41, 42, 43, 54, 60, 64), not 12. `FORMAT_ERROR_KEYS` (`:76-90`) is 13 keys. Neither
is 12.

**"`obligation.unitRecord.identifiersRequired` has no en.json key at all" — true but harmless,
and it belongs in bucket (c), not (d).** Confirmed absent from `en.json`. But I traced the
render path: `engine/index.js:531` pushes `{ code: group.requires.errorCode }`;
`contract.js:184-188` collects it; `check-your-answers/controller.js:318-324` iterates those
errors and builds its text from **`t('cya.promptGroupInvariant')`** — it never goes through
`textFor()`. So the user sees "Add at least one identifier for animal {unitN} on commodity line
{lineN}" (`en.json:488`), not an `unknownCode` fallback. The code is machine metadata. The only
real defect here is that `cya.promptGroupInvariant` is one of the 18 ungated keys.

---

## Strongest version that is true

See `amendedClaim` in the structured output.

## What this does to the L2 verdict

Nothing. L2's headline (B-better on i18n, decisively, and for model reasons not finish-line
reasons) is untouched — this claim only ever concerned B's *self-assessment*. If anything the
correction **strengthens** B: the reason "no Welsh" is cheap to fix is that B resolves *no copy
at module scope*, which is exactly the late-binding seam L2 credits it with. The one place L2
should be adjusted is its own bullet list, which reproduces the "1 items" and "no request in
scope" errors verbatim.
