# Multi-select search

`appMultiSelectSearch` is a search whose results the trader ticks, choosing
several things across several searches. Without JavaScript it is a submitted
search: the Search button posts the page's form with `action=search`, and the
server renders the page again with the results. With JavaScript the results
refresh in place as the trader types, ticks, removes or clears, and nothing
reloads.

The macros are in `macro.njk` beside this file. The enhancement is
[`src/client/javascripts/components/multi-select-search.js`](../../../../client/javascripts/components/multi-select-search.js).
The commodity search page is the first page to use it. See
[`commodities/search/search.njk`](../../../app/sets/live-animals/journeys/linear/features/commodities/search/search.njk).

## What the page supplies

- **The results.** The caller body of `appMultiSelectSearch` is whatever the
  page lists under the box, such as the tick boxes, a summary of what is chosen,
  its Remove and Clear all buttons, and hidden fields for choices that are not
  on screen. The component never builds any of it.
- **A results route.** This is a POST route that takes the page's own form and
  answers with `appMultiSelectSearchResults`. The body of that response is the
  same results, rendered by the same partial the page uses. The route may store
  the search rows it shows, as the page's own search does, so a later save can
  check a choice against them. It never saves the trader's choice: only the
  page's save does that.
- **The announcement.** The `announcement` param of
  `appMultiSelectSearchResults` is what a screen reader is told after a search,
  such as how many results there are. It is page copy, so the page builds it.

Because the page renders the results on both paths, the matching, the order,
the labels, the bold text and the validation each have one owner, on the
server.

## The macros

`appMultiSelectSearch` takes:

| Param        | Meaning                                                                       |
| ------------ | ----------------------------------------------------------------------------- |
| `search`     | The `appSubmittedSearch` params for the box. The macro sets its type and ARIA |
| `resultsId`  | The id of the element that holds the results                                  |
| `resultsUrl` | Where the enhancement posts the form for fresh results                        |

It renders the box (`type="search"`, `autocomplete="off"`, `aria-controls`
naming the results) and a visually hidden `role="status"` live region. The
results element follows them.

`appMultiSelectSearchResults` takes `announcement` and wraps the results for
the response.

## Styles

`multi-select-search.scss` beside the macro draws the design's dropdown and
chips. The page puts its results in the classes it styles, each prefixed
`app-multi-select-search`, and this list is the one that names them all:

- `__dropdown` is the results list, joined to the bottom of the search box. It
  scrolls past 270px. Mark it `data-multi-select-search-dropdown` so the script
  can hide and show it.
- `__group` and `__group-heading` style a `govukCheckboxes` fieldset and its
  legend as a heading row, with the options indented and striped beneath it,
  starting shaded. A hovered small tick box gets no ring; focus keeps its ring.
- `__message` is a row of text in the list, such as no results.
- `__selected` and the classes inside it draw what has been chosen: the count
  with Clear all beside it, then a chip per choice under its group, each with a
  cross to remove it. Inside it go `__selected-header`, `__selected-heading`,
  `__clear`, `__selected-list`, `__selected-group`, `__selected-group-label`,
  `__chips`, `__chip`, `__chip-label` and `__chip-remove`.
- `__update` is a button under the results for use without JavaScript, such as
  "Update selected" posting `action=search`. A tick cannot post the form
  without a script, so this is how the chips catch up. The script adds
  `app-multi-select-search--enhanced` to the component once it is wired, and
  that class hides the button, because with JavaScript a tick refreshes the
  chips itself.

The styles sit on the page's own markup, so the look is the same with
JavaScript on or off.

## How the script works

- It enhances the element carrying `data-module="app-multi-select-search"`.
  That element must sit inside a form.
- Typing posts the form once the trader pauses. Ticking or unticking a result
  posts it straight away. Both send the Search button's `action=search`.
- Pressing Search, Enter in the box, or any button inside the results is caught
  before the form submits. The button's own name and value are posted, so the
  route can tell a Remove from Clear all.
- A button outside the component, such as Save and continue, submits the form as
  usual. If refreshes are still on their way, the submit waits for them to land,
  so a save pressed straight after Clear all or a Remove saves what the trader
  sees. A typed search still waiting for the trader to pause is dropped.
- Refreshes run one at a time. Each is posted only once the one before it has
  landed, from the form that one left, so a search pressed straight after Clear
  all does not post the cleared choices again. Two refreshes never reach the
  server at once, so neither can overwrite the search rows the other stored.
- Each response replaces the results.
- After a swap, focus goes back to the element with the same id. If that element
  has gone, such as a Remove button, focus moves to the search box. If the
  trader has moved focus elsewhere while the results refreshed, it stays there.
- After a typed search or a Search press, the live region reads the response's
  announcement. A tick, a Remove or Clear all announces nothing.
- When the results route fails or cannot be reached, the script submits the
  form with the button that started the refresh, so the trader gets the page
  without JavaScript.
- Escape in the search box hides the dropdown and keeps the term, because the
  browser's own Escape would clear a search box. A click outside the component
  hides it too. It hides on the click, not the press, so the layout does not
  move under a button the trader is clicking. Focusing or clicking the search
  box shows it again, and each refresh shows the new results.

## Tests

The script's unit tests are beside it, in `multi-select-search.test.js`. They
render the real macros. The commodity search FIT spec
(`commodities/fit/search.fit.spec.js`) runs the page with JavaScript on and
with it off.
