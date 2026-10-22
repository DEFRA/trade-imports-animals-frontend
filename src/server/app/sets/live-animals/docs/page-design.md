# Page design decisions

Why the journey's pages look and behave as they do. The behaviour spec says
what each page does; this page holds the reasons that would otherwise sit in
code comments. Commodity rules are in [Set-owned services](services.md).

## Overview (hub)

- The task list is headed "Notification tasklist" and split into six numbered
  sections. The numbers are part of the heading copy, so reordering a section
  means editing its copy too.
- A task reads "Complete" or "To do" and nothing else. A part-answered or
  optional task reads "To do". A task whose stored answer no longer passes its
  own page's rules also reads "To do": the hub works this out per request,
  and `rowStatus` stays a pure engine query.
- Every task is a link from the moment the notification exists, so a trader
  can work in any order. A task that does not apply to the consignment is
  left off the list rather than shown shut.
- The identification task appears only once a chosen commodity carries an
  identifier. Its part, `commodityLines`, is always in scope, so `statusOf`
  never reaches Not applicable for it; the row carries its own applicability
  test, the same one the identification page uses.
- The commodity details task comes first in the second section, then
  identification, then additional details: the order the opening run visits
  them.
- Only "Roles and addresses" carries a hint. A row with no hint gets no hint
  slot, because `govukTaskList` draws an empty hint element for
  `{ text: undefined }`.
- The commodity totals show from the first visit, reading zero.
- The overview has no back link. It is the top of the notification; the way
  out is "Return to dashboard" or the service navigation.
- "Review and submit" is a button under the task list, offered whatever is
  still owed, so a trader can read back what they have entered at any time.

## Check your answers (review)

- The review has the same six numbered sections as the hub, with a
  subsection heading over every card.
- Each card has one Change link, in its heading. Rows carry none, except
  "Edit details" on an address copied onto this notification. A page that is
  only sometimes asked gets its own card and link.
- The contact address row is keyed "Contact address", not "Address": the
  page lists several addresses.
- A blank answer on a finished card reads "Not applicable", and the cell
  carries an empty flag, not just that text, because a trader can type "Not
  applicable" into a free-text answer. On a card that still owes answers,
  every blank cell, required or not, has no visible text and no flag, and
  "Missing" is announced only to a screen reader. The card's red left border
  and "Complete ..." line are the only visible marking.
- Every task row belongs to exactly one card, so "no unfinished card" and
  `readyForCheckYourAnswers` give the same verdict.
- Species cards carry no card id, so the error summary names outstanding
  species answers but marks no species card.
- The documents card always shows, because documents are part of the
  notification even when none are uploaded. With none, it says so.
- A submitted notification's review shows no form, no Change links and no
  document scan errors.
- The means of transport row reads the arrival page's own label for the
  stored code, so the two cannot differ.
- An answer the reference data has since retired is named on the review with
  the message its own page gives. An unfinished card says "complete" instead
  of the stale answer's message.
- A party never answered raises no address error. Its card is unfinished.
- The reason-for-import card carries the exit answers, and its one Change
  link reaches the page that collects them.
- A summary entry for a card that is out of scope is absent, so every entry
  links to an anchor the page carries.
- Each card's Change link ends, for screen readers, with the card's title in
  lower-case words.
- The review ends with the Continue button alone, because its label carries
  the whole instruction, so no heading and no sentence stand above it.
- An unfinished card's line is the same in the error summary and in the card,
  so a trader reading either sees the same words.

## Submitted page

- The page goes from the reference panel straight to what the trader still
  owes. The declaration date is shown only on the declaration page.
- Documents are not required to submit, so a notification with none lists
  them as still owed.
- The help links to HMRC open in a new tab. Their visible text is unchanged
  and a visually hidden "(opens in a new tab)" tells screen reader users.
- The customs link goes to HMRC's customs, international trade and excise
  enquiries page, not its contact index, which lists every tax and helpline.
- "Create a new notification" is a form button styled as a link, because
  starting a notification creates a record. It is offered so a trader with a
  second consignment need not return to the dashboard to find the start
  button.

## Declaration

- The confirmation is one small checkbox in a fieldset whose legend is for
  screen readers only, so a lone checkbox still has a group label.
- The page carries no status strip, at a first submission or an amendment.
- The date of declaration is shown in bold.
- The hidden `step` tells a Submit from a Continue, because an unticked box
  posts nothing.
- The checkbox is never pre-ticked, because a tick left by a submit refused
  as stale was given to older content.

## Origin of the import

- The country is checked only against the list, not required, so a trader can
  save what they know and return.
- The list names a territory with its country, "Canary Islands (Spain)", and
  is sorted by the name shown.
- With JavaScript the region code box shows the country's code as a fixed
  prefix, empty until a country is picked and filled in as soon as one is, so
  the trader types only the rest. Without JavaScript there is no prefix. The
  stored answer is the whole joined code either way.
- The server always draws the prefix, so a revisit or an error shows the saved
  or submitted code at once. Styling hides it until GOV.UK Frontend's
  JavaScript can run, and a small client module updates it on a change of
  country.
- The country-to-prefix rule has one owner on the server. The page hands the
  browser a map built with it, and the module only looks the chosen country up.
- A code typed with the country's code and a hyphen (for example "FR-75") is
  recognised and not doubled. A code typed with the country's letters but no
  hyphen (for example "FR75") is kept as typed and joined to the prefix
  ("FR-FR75"), because a real region code can begin with those letters.
- The region code is required under Yes, and stored only with a country's
  prefix. Under No, or with no country, the stored code is empty.
- The rules measure the typed part with any typed prefix removed, whatever the
  answer; the page shows back what was typed.
- The region code box stops typing at the same length the rule allows. The
  stop applies to the raw text, so a trader without JavaScript who types the
  country's code before a rest of more than two characters has it cut short.
- Clearing the country clears the region code too, because the prefix
  depends on the country.
- The internal reference is checked for length only. It is the trader's own
  and keeps their punctuation.
- The back link goes to the dashboard until something is saved, then to the
  overview. A fresh draft loaded from the backend carries only the reference
  number the backend minted, which is not a saved answer, so its back link
  stays on the dashboard while the status strip still shows.
- The status strip shows from the first request.
- Stored answers are re-checked against the page's rules when the page opens,
  so a country the reference data no longer offers is named on the page.
- The overview origin task reads Complete only when a country is chosen and
  the region of origin code question is answered (Yes with a code, or No).

## Main import reason

- A question two reasons ask has a form field per reason, because two inputs
  cannot share a name. Both map back to the one answer.
- The reason a reveal belongs to carries the explanation, so its follow-up
  questions ask with a label alone, and the exit date keeps only its worked
  example.
- The unreadable-date message does not repeat the field name that the label
  already gives.
- The destination country and port of exit are type-ahead searches using the
  shared search control, with the look the origin and port of entry searches
  share: a bold label and full width.
- Type-ahead suggestions match ignoring accents as well as case, so plain
  letters find "Côte d'Ivoire".
- Origin and port of entry share the medium label, but this page asks its
  searches as follow-up questions, so it sets the small label itself, and
  "Select one" in both the empty box and the select's first option.
- The exit date has a regular-weight label and a GOV.UK margin override on its
  form group. GOV.UK Frontend zeroes
  the bottom margin of the last form group nested in another, which would leave
  the date box touching "Port of exit".

## Additional details

- The certification hint names the ITAHC because a trader holds several
  certificates, so "the health certificate" does not say which one the
  certification purposes are copied from. The abbreviation matches the
  documents and review pages.

## Identification

- The page uses the full-width surface so the tables and cards fit. The error
  summary, caption, heading and inset text keep a two-thirds reading width.
- Identification is grouped by commodity: one section per commodity headed
  "<commodity name> (<commodity code>)", holding one card per species. The
  card is built from GOV.UK summary card styling and `govukTable`, not the
  prototype's custom CSS and div grid, so tables keep their meaning and
  reflow at 390px.
- The saved-animals and Selected commodities tables set
  `app-table__cell--break-anywhere` on their cells. It is a deliberate custom
  class so long unbroken identifiers and commodity names wrap inside table
  cells at 390px.
- A species with no number of animals has no card, and a consignment whose
  identified species all lack a count shows the summary and no cards.
- The card title is the species name, with "Change number of animals" beside
  it naming the species. The link keeps the change context, so Continue on
  Commodity details returns to where the trader came from.
- While animals remain the card shows the entry form, then the in-card button,
  then the saved-animals table. A finished species shows its saved animals
  alone, with no form, no button and no completion message. A count lowered
  below its saved records still shows the over-count message.
- The in-card button says what pressing it does next: "Save and add another"
  while more than one animal is outstanding, "Save and finish" on the last,
  and it is a primary button. It saves only its own species' current animal
  and reloads with that form empty. A line of one animal has no in-card
  button.
- "Save and continue", "Save and return to overview" and the amend buttons
  save only the forms of species with one animal. Values typed into the form
  of a species with more animals are neither validated nor saved by them.
- An identifier has one name, used both on the entry field and as the
  saved-animals column heading, and no identifier field has a hint. Labels
  are regular weight.
- The saved-animals table has one column per identifier the commodity
  declares, not per identifier the trader filled. The header row says which
  identifiers the line expects, and an empty cell shows which are still
  missing.
- A consignment with nothing to identify skips the page.
- The phone field is the one permanent-address field with a hint. A trader
  giving an address outside the UK cannot otherwise know the number is dialled
  from here.

## Commodity pages

- A choice made under an earlier search has no tick box on screen, so it is
  sent back with the form as a hidden value.
- Commodity code 01061900 covers several commodities and hundreds of species.
  Each chosen species gets its own Selected commodities row, named by the
  species, on both Commodity details and Identification.
- The commodity heading on Commodity details is set at the larger size because
  the commodity blocks are the substance of the page. The type steps down from
  commodity to species to quantity labels, and the labels carry a size so they
  do not read at the weight of their hints.
- The number of animals question has no hint because the page repeats it per
  species, so an example would repeat with it.
- Each search option shows its common name with the Latin name in brackets, so
  a trader who does not read Latin can tell the tick boxes apart.
- The inset's second sentence stops a reader concluding that goods with no
  certificate need no notification.

## Consignment addresses pages

- The consignment addresses page gives each party its own section: a medium
  heading, its hint, then either a named "Add a …" link or the chosen address
  in an inset text with Change and Edit details under it. The trader sees
  which full address they chose, name and every address line. The county
  parish holding number follows the same section shape, with its stored value
  on one line and no Edit details.
- Each section is a region named by its heading, so a screen reader lists the
  parties. The add link names the party, so it needs no visually hidden
  suffix. Change and Edit details keep a visually hidden suffix naming the
  party, because two sections would otherwise offer the same link names.
- The inset shows the name in bold, then each street line on its own line.
  The locality, county, postcode and country join into the last line, as in
  "Hull, HU9 5PX, United Kingdom". The country is the name held on the
  notification's copy of the party, so the page never asks the address book.
- Every party link carries the change context. A trader sent here from check
  your answers goes out to the picker or the edit page and has to come back
  here, and this page's Continue then returns them to check your answers.
  The county parish holding link does not: its route already carries
  `return=addresses`.
- Each party picker searches the address book from the submitted search box:
  a medium "Search" label, the hint "Name, address or country", and a square
  GOV.UK blue icon button joined to the box. The button is named "Search" for
  screen readers and is the form's first submit, so Enter in the box runs the
  search. The box and button are half the content column wide.
- The picker is one form. The search and Save and continue are told apart by
  their `action` value. Paging is a link, so the selection travels in the
  link's query string and in a hidden field, with no client JavaScript.
- A picker is reached from the consignment addresses page, not from the hub,
  so it ends with the primary alone.
- "Add a new address" is a secondary button beside the heading, shown only
  outside stub mode. It leaves the journey for the address book, so it sits
  with the page and not inside the search form.
- The results sit under the heading "Select an address", with the count
  "Showing 5 out of 13 results" straight under it. The table is one fieldset
  whose visually hidden legend repeats the heading, so a screen reader names
  the group of addresses. With no matches the message takes the place of the
  count.
- A save with nothing chosen leaves without refusing and commits nothing, so
  the role stays empty or keeps the address it held. An address that is not
  in the book, or no longer in it, is refused with the role's error. A
  missing or deleted selection travels as no selection, and a Change link's
  context is kept on every way out of the picker.

## CPH number

- The three part labels stay on screen. Three unlabelled boxes under one
  legend would be harder to use than the single field they replace.
- The help names APHA documents only. A link to GOV.UK holding details waits
  for a real destination.
- The boxes set no character limit, so nothing typed or pasted is cut short.
  When the county box holds nine digits, with or without spaces or slashes,
  and parish and holding are empty, the number is split into its three parts
  on save. Anything else, such as `1234` in the county box, goes through the
  per-part checks unchanged and every box keeps what was typed.
- Nothing moves focus between the boxes (WCAG 3.2.2; GOV.UK forms do not
  auto-advance).
- One error message belongs to the group, not to each box. The date-input row
  classes only sit the boxes side by side.

## Documents

- The file field is labelled "Attachment", the noun the review also uses.
- The Status column reports the virus check ("Scanning for virus", "Check
  completed"), not a verdict on the file.
- A chosen document type means a document is on its way, so Continue finishes
  a part-filled form rather than dropping it.
- The file size limit is held at 10 MB so the request stays inside the CDP
  ingress body cap.
- The page uses the full-width surface so the added-documents table fits. The
  guidance and the fields keep a two-thirds reading width.
- With no documents, the File upload card shows no table and no sentence.
- The Document reference field has no hint.
- The reference cell breaks a long unbroken reference onto further lines, so
  the table stays inside the card. The actions sit at the right-hand end of
  each row.
- Exception to the "no custom CSS" rule in `.claude/rules/gds.md`: the
  reference cell carries `app-table__cell--break-anywhere`.
  `govuk-!-text-break-word` sets only `overflow-wrap: break-word`, which
  leaves a table cell's minimum width at the unbroken reference, so a
  reference of the maximum length pushes the table past the card.
- The limit error belongs to the Attachment field: the summary links to it and
  the same message shows on it.
- Every document field is mandatory per record and there is no edit page, so
  presence is checked when a document is added.
- The error summary lists the fields in the order they appear on the page.
- A saved document returns the trader to the page, so a reload cannot replay
  the save. Continue is pressed again from the fresh page once scans settle.
- A file still being checked holds Continue back. The exit to the overview
  does not wait.
- A well-formed upload id from another journey answers 404, not 403, so the
  journey never confirms that upload exists.
- The drop zone wording matches the design system's own defaults.
- A document's file is opened with a link, not a submit, so it needs no crumb.
  A file is offered only once its scan has settled clean.
- The Status tag carries a visually hidden name for the document it belongs
  to, so a screen reader hears what was checked.

## Transport

- The arrival date hint gives a fixed date showing the format, not a date tied
  to the window. The date picker's bounds and the out-of-range error police
  the window.
- The port search shows its select text, "Select a port", in its empty box as
  well as in the no-JavaScript list's first entry.
- The means of transport options read Air, Rail, Road and Sea, and each stores
  its reference code (AIRPLANE, RAILWAY, ROAD_VEHICLE, VESSEL).
- The transport identification hint is a lead-in and one bullet per
  alternative, so the number of choices shows at a glance.
- The transit countries cap is not stated up front. The search goes when the
  last country is added, and the status message says why.
- The transit search's select text, "Select a country", and its empty-box
  text, "Search for a country", differ because the select asks for a choice
  and the box asks for a search.
- Countries already added stay in the transit search list, and a repeat is
  refused by name, which tells the trader more than a country quietly missing
  from the list.
- A stored transit list is checked against the page's own rules on GET, and a
  banner names any country no longer offered before Continue saves the
  filtered list.
- The transit page offers the origin list, not every code the label lookup
  resolves: GB has a label for address forms but is not offered here.
- An empty transit list is a valid answer, because the question is optional. A
  list holding a country not offered is refused: on submit as not from the
  list, on a stored answer as no longer available.
- The transporter list shows its facts in headed columns, with a status tag:
  green for approved, magenta for newly added.
- The list search matches name, address, approval number, type and status,
  ignoring case and accents, so a trader typing plain letters finds an
  accented name.
- With JavaScript the list narrows in the page as the trader types, because
  the page already holds the whole list and needs no endpoint. The matching
  letters in each shown cell are bold, and a polite live region says how many
  rows are shown. Pressing the search button or Enter runs the same filter and
  posts nothing, so the page keeps the whole list to filter again.
- Without JavaScript the search is a submit on the page's own form, and the
  server returns the narrowed list. The pick travels through a search in a
  hidden `selected` field, and search and save are told apart by their
  `action` value.
- A transporter picked and then filtered out of view stays picked: the
  filter hides rows and never unchecks a radio.
- A term that runs across two cells, such as an address into an approval
  number, still finds its row. No single cell holds the whole term, so
  nothing is bold.
- "Add a transporter" sits on the search row, right-aligned, above the table,
  and drops below the search on a phone. The tab order is the search box, the
  search button, "Add a transporter", then the radios.
- "Choose a transporter type" warns that adding is a last resort. Private
  comes first and has no hint; Commercial explains the Northern Ireland
  condition.
- A commercial transporter added by hand can only be from Northern Ireland,
  so the country is shown, not asked. It is stored in English, because it is
  an answer, not display text. A posted value other than Northern Ireland has
  been tampered with and is refused.
- The commercial form opens with the authorisation rules the list states,
  read from the list's own copy.
- Both add forms close the address at the country, then head the contact
  details, email before phone. Both hint the international dialling code.
- A transporter typed in by hand joins the organisation's list as New, not
  approved.
- A private transporter's country is stored as the display name and the ISO
  code, so neither persistence nor the review needs a lookup.
