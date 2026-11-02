# Accessible autocomplete

`appAccessibleAutocomplete` turns a native `govukSelect` into a type-ahead. The
select stays in the page as the control that posts; the script enhances it when
JavaScript runs, and without JavaScript the trader uses the plain select.

The macro is `macro.njk` beside this file. The enhancement is
[`src/client/javascripts/components/accessible-autocomplete.js`](../../../../client/javascripts/components/accessible-autocomplete.js).
The styles are `accessible-autocomplete.scss` beside the macro.

## The macro

The macro takes the usual `govukSelect` parameters (`id`, `name`, `label`,
`hint`, `errorMessage`, `value`, `items`, `classes`, `formGroup`) and an
optional `autocomplete` object. The parameter block at the top of `macro.njk` is
its public contract.

The macro's `autocomplete.placeholder` is the text in the empty search box, the
library's word for it. The select's own empty first option is the select text,
and the feature's copy owns both.

## Data attributes

The macro writes the options onto the select as data attributes, and the script
reads them from `dataset`.

| Attribute              | Macro parameter              | Meaning                                   |
| ---------------------- | ---------------------------- | ----------------------------------------- |
| `data-module`          | none                         | Names the module that enhances the select |
| `data-min-length`      | `autocomplete.minLength`     | Characters typed before matches show      |
| `data-language`        | `autocomplete.language`      | `en`, or `cy` for the Welsh status text   |
| `data-show-all-values` | `autocomplete.showAllValues` | Shows the whole list on focus             |
| `data-auto-select`     | `autocomplete.autoselect`    | Highlights the first match                |
| `data-default-value`   | `autocomplete.defaultValue`  | Prefills the search box                   |
| `data-no-results`      | `autocomplete.noResults`     | Message shown when nothing matches        |
| `data-placeholder`     | `autocomplete.placeholder`   | Text in the empty search box              |

## How the script works

- The suggestions are the select's options that carry a value. The option with
  an empty value is the select text and is never suggested.
- A query matches an option when the option contains the query, ignoring case
  and accents (`containsTerm` in `src/client/common/helpers/search-fold.js`).
- The suggestion template hook is `templates.suggestion`. It renders each
  suggestion through `escapeAndBoldMatches`
  (`src/client/common/helpers/bold-matches.js`), which escapes the text and
  bolds the matching letters.
- Choosing a suggestion, or leaving the box on an exact match, selects the
  matching option and fires one `change` event on the select when its value
  changed.
- With `data-language="cy"` the script replaces the library's assistive hint
  and status messages with Welsh text.
- The script moves the select's `aria-describedby` onto the enhanced input, so
  the hint and error message are announced with it.
- The search button beside the box is decorative. It is hidden from assistive
  technology, is out of the tab order, and focuses the box when it is clicked.

## Upgrade path

The script is adapted from HMRC Frontend's accessible-autocomplete component.
The licence header in the script records the repository, the file and the
pinned commit, and stays in the file because the Apache 2.0 licence requires the
notice.

To take a newer HMRC version:

1. Diff HMRC's `accessible-autocomplete.js` between the pinned commit and the
   commit to adopt.
2. Port each change into the script, keeping the data-attribute contract above.
3. Replace the pinned commit in the licence header.
4. Run the unit tests for the script and the type-ahead FIT spec
   (`features/type-ahead.fit.spec.js`), which prove the attributes, the
   suggestions, the change event and the styles.

The `accessible-autocomplete` package itself upgrades through `package.json` in
the usual way. Its styles are overridden in `accessible-autocomplete.scss`, so
re-check the focus indicator, the typography and the error border after an
upgrade.
