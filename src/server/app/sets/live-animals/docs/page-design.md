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
- The identification task appears for any consignment that holds a chosen
  commodity line, and is Not applicable only when the notification holds
  none. Its part, `commodityLines`, is always in scope, so `statusOf` never
  reaches Not applicable for it; the row carries its own applicability test,
  the same one the identification page uses.
- The commodity details task comes first in the second section, then
  identification, then additional details: the journey's page order, which
  Save and continue follows.
- Only "Roles and addresses" carries a hint. A row with no hint gets no hint
  slot, because `govukTaskList` draws an empty hint element for
  `{ text: undefined }`.
- The commodity totals show from the first visit, reading zero.
- With no commodity chosen, the commodity details task is still a link: the
  consignment details page asks the commodity question rather than drawing an
  empty table, and a task opened from the overview goes on to the next page that applies
  when saved.
- Each hub group renders a task list of its own, and `govukTaskList` stamps
  the group id on the status of every item in it.
- The overview has no back link. It is the top of the notification; the way
  out is "Return to dashboard" or the service navigation.
- "Review and submit" is a button under the task list, offered whatever is
  still owed, so a trader can read back what they have entered at any time.

## How a page ends

- A page the overview links to directly ends with all three controls: the
  primary and "Save and return to overview" side by side, then "Cancel and
  return to overview" on its own line below them, so a trader can stop and
  leave from where the overview sent them.
- Origin of the import is the one overview-linked page without the return
  controls, because the design gives it "Save and continue" as its only way to
  save and move on, on a draft and while amending alike.
- The two return controls name the page they lead to, which is headed
  "Overview". "Hub" is the internal name for it and never appears on screen.
- A page reached from another page ends with the primary alone, and the trader
  leaves the way they came in: the CPH number page, the permanent address
  page, the role address pickers and the transporter type question. The two
  transporter details forms are
  the one exception: each ends with the primary and a secondary "Cancel and
  return to dashboard", because a trader who opened one did not come from the
  hub and the design gives the add route its own way out of the journey.
  Saving either form returns to the transporter list with the new transporter
  chosen, and Back goes where the trader came from.
- While a notification is being amended, a page ends exactly as it does on a
  draft: Save and continue, then Save and return to overview, then Cancel and
  return to overview wherever the draft page shows it. Save and continue goes on
  through the journey to check your answers, Save and return to overview goes to
  the Overview, and Cancel and return to overview goes to the Overview without
  saving the page. Upload documents posts its own form from both buttons. The
  status strip shows the Amend status and its Cancel amend link. The two
  transporter details forms keep their own primary and cancel even
  while amending.

## Check your answers (review)

- The review's Back link goes to where the trader came from: the last journey
  page, the Overview or the dashboard, on a draft, an amendment and a submitted
  notification alike. Reached any other way it goes to the Overview on a draft or
  an amendment and to the dashboard on a submitted notification. See
  [Back on check your answers](journey-flow-and-gates.md#back-on-check-your-answers).
- The review has the same six numbered sections as the hub, with a
  subsection heading over every card.
- Each card has one Change link, in its heading. Rows carry none, except
  "Edit details" on an address copied onto this notification. A page that is
  only sometimes asked gets its own card and link.
- The contact address row is keyed "Contact address", not "Address": the
  page lists several addresses.
- The roles-and-addresses card carries one row per animal that has a saved
  permanent address, after the county parish holding row, each keyed by the
  animal's species common name and number and holding that animal's saved
  address exactly as a party row reads. An animal that still owes one has no
  row: the card that shows the answer is not the card that owes it. A line
  that needs a permanent address with no animal counted carries no row
  either. The species card's identifier table heads only the identifiers the
  species was asked for; it carries no permanent address column.
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

- The country is required on save and continue. An empty answer is refused with
  **Select a country of origin**; a typed value not in the list is refused with
  **Select a country from the list**. A saved country the reference data no
  longer offers is refused on submit with its own message.
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
- The back link follows the rule in
  [Entry guard and the Back link](journey-flow-and-gates.md#entry-guard-and-the-back-link).
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
  species all lack a count shows the summary and no cards.
- The card title is the species name, with "Change number of animals" beside
  it naming the species. The link pushes this page onto the trail, so Back on the count page returns here and Continue on
  Commodity details goes on to the next page that applies.
- While animals remain the card shows the entry form, then the in-card button,
  then the saved-animals table. A finished species shows its saved animals
  alone, with no form, no button and no completion message. A count lowered
  below its saved records still shows the over-count message.
- The in-card button says what pressing it does next: "Save and add another"
  while more than one animal is outstanding, "Save and finish" on the last,
  and it is a primary button. It saves only its own species' current animal
  and reloads with that form empty. A line of one animal has no in-card
  button.
- "Save and continue" and "Save and return to overview"
  save only the forms of species with one animal. Values typed into the form
  of a species with more animals are neither validated nor saved by them.
- Pressing Enter in any field presses the page's hidden default button. It
  saves every card holding typed values, species with more animals included,
  and keeps the trader on the page when one of those was saved. The hidden
  button comes first in the form so that Enter never presses a Remove button
  or the visible "Save and continue".
- An identifier has one name, used both on the entry field and as the
  saved-animals column heading, and no identifier field has a hint — the
  identification-details and description fallback follows this too. Labels
  are regular weight.
- The saved-animals table has one column per identifier that species' panel
  asks for, not per identifier the trader filled: the commodity's own
  identifiers, or the two free-text fallback answers for a commodity that
  declares none. The header row says which identifiers the line expects, and
  an empty cell shows which are still missing.
- Removing an identifier record is a POST on the card form with no GET, so a
  link cannot trigger it.
- The page is skipped only when the notification holds no commodity line.

## Commodity pages

- A choice made under an earlier search has no tick box on screen, so it is
  sent back with the form as a hidden value.
- A search's results are listed in order: the commodity groups by their
  heading, and each group's species by the label they are offered under, over
  the page of results the search returned.
- A species reads as its Latin name with its common name in round
  brackets wherever it is listed or named — the search results, the selected
  panel, Commodity details, the Selected commodities tables and
  Identification details — and as its Latin name alone where the
  reference data holds no common name for it. The permanent-address rule and
  the identifier-column rule read the line's stored Latin name rather
  than that label, so a species whose common name changes what it reads as
  still gates the same way.
- The selected panel offers a removal per chosen species, posting the page
  form with the species' key in the button value so the entry pressed is the
  entry removed however the panel is ordered — the same rule the Transport
  section states at the Transit countries bullet below.
- Because a tick box on screen carries no hidden value, a removal naming a
  choice the post no longer carries, because the trader unticked that box
  first, is honoured and nothing is logged. A removal naming a key the stored
  search rows never held is refused with a bad request and one logged
  refusal — reachable by a tampered post, and by a page left open across a
  save and a later removal of that commodity line on commodity details,
  because a save empties the stored search rows.
- Commodity code 01061900 covers several commodities and hundreds of species.
  Each chosen species gets its own Selected commodities row, named by the
  species, on both Commodity details and Identification.
- The commodity heading on Commodity details is set at the larger size because
  the commodity blocks are the substance of the page. The type steps down from
  commodity to species to quantity labels, and the labels carry a size so they
  do not read at the weight of their hints.
- The number of animals question has no hint because the page repeats it per
  species, so an example would repeat with it.
- A search option shows the species label with the part the query matched in
  bold, so a trader can see at a glance why each result was offered.
- The inset's second sentence stops a reader concluding that goods with no
  certificate need no notification.
- A removal leaves the trader on Commodity details while a line is left, with
  every number they had typed still in its field, because the page answers
  the removal itself rather than redirecting to it. The page is one form,
  opening with a hidden submit before the selected-commodities table, so
  Enter hits it rather than the first Remove, and ending with the save
  actions. Each Remove carries the entry it removes — the
  commodity's code on a code row, the line's key on a species row — so a
  repeated or stale removal is refused rather than taking another row, the
  same rule this doc states above for the selected panel and below for
  transit countries. A removal that empties the selection still goes to the
  commodity question, because that is where the next answer comes from. A
  removal is a POST on the page form with no GET, so a link cannot trigger
  it.

## Consignment addresses pages

- The backend names the place of destination `destination` and the contact
  address `consignment`; the journey says `placeOfDestination` and
  `contactAddress`. Every other role has the same name in both.
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
- Every party link carries the trail. A trader sent here from check
  your answers goes out to the picker or the edit page and has to come back
  here, and Save and continue here goes on to the contact address.
  The county parish holding link carries the trail and the `return=addresses`
  marker.
- Each party picker searches the address book from the submitted search box:
  a medium "Search" label, the hint "Name, address or country", and a square
  GOV.UK blue icon button joined to the box. The button is named "Search" for
  screen readers and is the form's first submit, so Enter in the box runs the
  search. The box and button are half the content column wide.
- The picker is one form. The search and Save and continue are told apart by
  their `action` value. Paging is a link, so the selection travels in the
  link's query string and in a hidden field, with no client JavaScript.
- Edit details is offered only for an address the picker has copied onto the
  notification, so with no address picked the edit page sends the trader to the
  picker.
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
- The permanent address section is a third section shape, for a consignment
  carrying a cat, dog or ferret line, alongside the party sections and the
  county parish holding section. Its hint is a lead-in sentence followed by
  two bullets, not the party sections' single-line hint. Once every animal
  that needs one has a permanent address, the section shows one address —
  every addressable animal saved against the place of destination, or only
  one animal needing one — or otherwise the one line "Permanent addresses
  added for N animals", N being the number of animals that need one. Either
  shape carries a "Change" link and no "Edit details": the address was
  hand-entered or copied from the place of destination on the permanent
  address page, never picked from the address book, so there is no record
  there to edit.

## CPH number

- The three part labels stay on screen. Three unlabelled boxes under one
  legend would be harder to use than the single field they replace.
- A CPH number is two digits of county, three of parish and four of holding,
  so the example hint shows that 2/3/4 grouping.
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

## Permanent address

- Reached only from the consignment addresses page's Permanent address
  section, for a consignment carrying a cat, dog or ferret line.
- Its cards come from the animal identifier records already entered, one per
  animal, never from the line's animal count: the permanent address is
  stored on the animal identifier record, so a card can only exist once that
  record does.
- A line that needs a permanent address with no animal identified yet shows
  no cards; the "Add the number of animals on consignment details before you
  can continue." message takes their place, and the save control still
  renders but writes nothing.
- Each card asks once, as its own radio group legend, whether the animal
  lives at the place of destination or at a new address. The page carries no
  second question above the cards.
- Choosing "Enter a new address" requires the name or organisation name,
  address line 1, town or city, postcode or Zip code, email address and
  phone number; address line 2 and county may be left blank. Every field's
  character limit and over-long message are the ones the owning
  `address-rules.js` already builds for the party-edit page; this page
  states only its own required messages, and no format check on email,
  phone or postcode.
- Choosing "Same as the place of destination (POD)" before the notification
  has one is refused on that card's radio group, naming no animal, on the
  field or in the summary.
- The error summary names the card's animal for an address field's refusal
  ("Enter address line 1 for Felis catus 1"); the message on the field itself
  stays plain ("Enter address line 1").
- The new-address fields ask no country; a hand-entered address always
  records the United Kingdom.
- The phone field is the one new-address field with a hint. A trader giving
  an address outside the UK cannot otherwise know the number is dialled from
  here.
- An animal left with neither option chosen saves with no permanent address;
  the save still succeeds for the others.

## Documents

- The file field is labelled "Attachment", the noun the review also uses.
- The Status column reports the check's progress ("Scanning for virus", "Check
  completed"), and on a refusal names the reason the upload service gave where
  the page has wording for it ("Virus found", "Upload failed", "Download
  failed"); a reason it has no wording for stays "Rejected" rather than being
  named wrongly.
- A document is started by any of its reference, type (offered or not), date
  of issue text or a chosen file. Any save button then keeps every answer
  typed, says what is missing, and adds nothing, or adds the document when it
  is complete, rather than dropping the part-filled form.
- The file size limit is whatever `MAX_FILE_SIZE_MB` in
  `journeys/linear/features/documents/upload-config.js` holds; nothing else
  states a figure. While the add form is open, every save button posts the form
  and its file to the upload service's `/upload-and-scan` session rather than
  to this service, and that session is opened with that limit to enforce, so
  the CDP ingress body cap does not bound it. The page states the same figure
  and checks it in the browser for any submit that sends the file, so a trader
  learns a file is too large before spending time uploading it. When the add
  form is closed, or a taken-on document or a removal is waiting to be
  retried, the save buttons post to this service and send no file, so the
  retry runs before anything else on the page.
- A file carrying no bytes is the right type and under the size limit, so it
  reaches the page rather than being stopped before it; the page is where it
  is refused, and nothing is added.
- With JavaScript on, the upload control the page shows is not the original
  file input, so the oversize summary error points at the control a trader
  can focus rather than at the hidden input behind it.
- The upload service decides for itself whether to take a file and may refuse
  one as too large on receipt; the page renders that refusal in its own
  wording.
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
- The limit error links to the documents already added, not to the Attachment
  field: at the cap the add control is shut, so pointing a trader at the file
  input would send them to a control they cannot use, while the table shows
  the documents they already hold.
- Every document field is mandatory per record and there is no edit page, so
  presence is checked when a document is added.
- The error summary lists the fields in the order they appear on the page.
- The document type select opens on its select text, which carries no value, so
  a form left on it submits an empty type. One message covers both mistakes a
  select can make: left on the select text, or carrying a value the page never
  offered.
- The offered document types are service-backed and primed at boot, so the
  type check is built for each add, not frozen at module load. The select's
  items, the add form's type check and the vocabulary this service sends to the
  backend are all one ordered list, so the order the page offers is the order
  that list states.
- A document saved by "Save and add another" or "Save and return to overview"
  is followed by a redirect, so a reload cannot replay the save. One saved by
  "Save and continue" is answered on the returned request
  by the save choice, exactly as any other save: a reload of that response
  saves nothing twice, because a document already listed is not added again.
  Nothing holds the trader for a scan still running.
- A document the scan rejected holds Continue back, and so does a document the
  upload service has taken on that this notification does not list — otherwise
  the trader would carry on with a claimed document missing from the
  notification. The exit to the overview waits for neither.
- A render reuses the session the page is already showing while that session
  is still waiting for its file, carried in the refresh link and a hidden
  field, so a scan being polled does not leave a run of registrations behind.
  A render that carries no handle, and one whose session has already taken its
  file, opens a session of its own, which is what keeps two concurrent adds
  off one handle. The carried handle is looked up on the notification, not
  trusted alone, so a handle another notification opened reaches nothing.
- A form carrying a session that has already taken its file is answered by the
  upload service and never by this one, because the save buttons post the file
  straight there: the page is served with no store, and the feature's client
  bundle opens it again by its own address when the browser hands back a copy
  it kept.
- The returned query key is the trader-facing word for what they return from.
  Its value is the correlation handle, because no upload id exists when the
  session opens. The return path is relative, because the upload service
  refuses an absolute redirect outside development.
- The reason the add control is shut sits before the control it refuses, and
  the control keeps its place in the tab order so the error summary can reach
  it.
- A well-formed upload id from another journey answers 404, not 403, so the
  journey never confirms that upload exists.
- The drop zone wording matches the design system's own defaults.
- A document's file is opened with a link, not a submit, so it needs no crumb.
  A file is offered only once its scan has settled clean.
- The file is served with no cache directive of its own: no-store is on the
  page because a kept copy of it can post to a spent upload session, and a
  file carries no session, so what a cache may keep of a trader's own document
  is a question still to be settled.
- The Status tag carries a visually hidden name for the document it belongs
  to, so a screen reader hears what was checked.

## Transport

- The arrival date hint gives a fixed date showing the format, not a date tied
  to the window. The date picker's bounds and the out-of-range error police
  the window.
- The arrival details page reads the arrival window once per request and hands
  it to both the date widget and the validator, so the two cannot disagree
  across midnight. A reading with no widget takes the window as it stands.
- The port search shows the search placeholder "Select a port" in its empty
  box, in the same words as the select text that is the no-JavaScript list's
  first entry.
- The means of transport options read Air, Rail, Road and Sea, and each stores
  its reference code (AIRPLANE, RAILWAY, ROAD_VEHICLE, VESSEL).
- The transport identification hint is a lead-in and one bullet per
  alternative, so the number of choices shows at a glance.
- Remove on an added country submits the page form, so the crumb travels with
  it and no GET can trigger it. The country code rides in the button value,
  so the row pressed is the row removed however the list has been reordered
  since the page rendered.
- The status message region ships empty and the page script writes the message
  into it just after load. A live region that already holds its text when the
  document is parsed is read as ordinary page content, and Add and Remove are
  full form submits, so the message arrives with a fresh document every time.
- The added-countries list names each country rather than its code, because
  the list is the whole record of the answer the trader reads back.
- Searching the transporters list filters it in place: nothing is validated or
  committed, and a picked row stays picked when the search leaves it on the
  list.
- The add-transporter link carries the trail, and the add form's own save
  carries it on to the transporter list, so a trader sent from
  check your answers goes on from the transporter list like any other start.
- The transit countries cap is not stated up front. The search goes when the
  last country is added, and the status message says why.
- The transit page's browser title is the short task name, "Transit countries",
  not its question heading, as the design sets it.
- The transit search's select text, "Select a country", and its empty-box
  text, "Search for a country", differ because the select asks for a choice
  and the box asks for a search.
- Countries already added stay in the transit search list, and a repeat is
  refused by name, which tells the trader more than a country quietly missing
  from the list.
- A stored transit list is checked against the page's own rules on GET, and a
  banner names any country no longer offered before Continue saves the
  filtered list.
- The transit page offers the same countries and territories as the country of
  origin page, each territory named with its country, not every code the label
  lookup resolves: GB has a label for address forms but is not offered here.
- An empty transit list is a valid answer, because the question is optional. A
  list holding a country not offered is refused: on submit as not from the
  list, on a stored answer as no longer available.
- The page names the choice once: a heading above the search box and the
  table, with the fieldset round the table carrying the same words,
  visually hidden, so a screen-reader user hears the group named and a
  sighted user reads the words once.
- The transporter list shows its facts in headed columns, with a status tag:
  green for approved, magenta for newly added. A transporter with no
  approval number reads "Not applicable" in that column.
- The list search matches name, address, approval number, type and status,
  ignoring case and accents, so a trader typing plain letters finds an
  accented name; a transporter with no approval number is matched by the
  "Not applicable" words its column shows.
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
- "Choose a transporter type" warns the trader to check the transporter list
  before adding a new transporter, to avoid duplicates. Private comes first
  and has no hint; Commercial explains the Northern Ireland condition. Its one
  button is a Continue, not a save.
- Each add form opens only for the transporter type it belongs to; opening or
  posting it for any other stored type, or none, returns the trader to the
  type question.
- The type question and the private form carry no status strip; the list and
  the commercial form do.
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
- Saving a complete record on either add form returns the trader to the
  transporter list, where the saved transporter is the first row, already
  chosen, under a one-time success notification banner titled "Success" and
  reading the transporter's name — only its first letter capitalised —
  followed by "transporter added". The banner shows on that one view only;
  reloading the list, or coming back to it later, shows it with no banner.
- Values entered on an add form whose save was refused are shown again in
  its fields the next time the trader opens that form, until the form is
  saved or cancelled.
- Each add form's secondary "Cancel and return to dashboard" discards those
  entered values, commits nothing to the notification and takes the trader to
  the dashboard, wherever the notifications list lives. When the stored
  transporter type was not changed on the way into the form, the transporter
  chosen before the add began is still chosen. A trader who changed the
  transporter type at the type question on the way in is left with the type
  they chose and no transporter: the type question's own purge removed the
  other type's stored transporter before the add form ever opened, and
  cancelling cannot restore it.
