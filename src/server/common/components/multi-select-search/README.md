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
  same results, rendered by the same partial the page uses. The route saves
  nothing the page's save would save. It only works out what to show.
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

## How the script works

- It enhances the element carrying `data-module="app-multi-select-search"`.
  That element must sit inside a form.
- Typing posts the form once the trader pauses. Ticking or unticking a result
  posts it straight away. Both send the Search button's `action=search`.
- Pressing Search, Enter in the box, or any button inside the results is caught
  before the form submits. The button's own name and value are posted, so the
  route can tell a Remove from Clear all.
- A button outside the component, such as Save and continue, submits the form as
  usual. If a refresh is still on its way, the submit waits for it to land, so
  a save pressed straight after Clear all or a Remove saves what the trader sees.
  A typed search still waiting for the trader to pause is dropped.
- Each response replaces the results. When responses arrive out of order, only
  the latest request's response is shown.
- After a swap, focus goes back to the element with the same id. If that element
  has gone, such as a Remove button, focus moves to the search box.
- After a typed search or a Search press, the live region reads the response's
  announcement. A tick, a Remove or Clear all announces nothing.
- When the results route fails or cannot be reached, the script submits the
  form with the button that started the refresh, so the trader gets the page
  without JavaScript.

## Tests

The script's unit tests are beside it, in `multi-select-search.test.js`. They
render the real macros. The commodity search FIT spec
(`commodities/fit/search.fit.spec.js`) runs the page with JavaScript on and
with it off.
