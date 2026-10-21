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
- A blank answer on a finished card reads "Not applicable". On a card that
  still owes answers, every blank cell is empty and marked missing, required
  or not. The empty mark is a flag on the cell, not its text, because a
  trader can type "Not applicable" into a free-text answer.
- Every task row belongs to exactly one card, so "no unfinished card" and
  `readyForCheckYourAnswers` give the same verdict.
- Species cards carry no card id, so the error summary names outstanding
  species answers but marks no species card.
- The documents card always shows, because documents are part of the
  notification even when none are uploaded. With none, it says so.
- A submitted notification's review shows no form.

## Submitted page

- The page goes from the reference panel straight to what the trader still
  owes. The declaration date is shown only on the declaration page.
- Documents are not required to submit, so a notification with none lists
  them as still owed.

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
  overview.
- The status strip shows from the first request.
- Stored answers are re-checked against the page's rules when the page opens,
  so a country the reference data no longer offers is named on the page.
- The overview origin task reads Complete only when a country is chosen and
  the region of origin code question is answered (Yes with a code, or No).

## Identification

- The in-card button says what pressing it does next: "Save and add another"
  while more than one animal is outstanding, "Save and finish" on the last.
  A line of one animal has no in-card button; the page's own "Save and
  continue" saves it.
- Each card links back to the page that sets the declared animal count, with
  no query or change context.
- An identifier has one name, used both on the entry field and as the
  saved-animals column heading.
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
  species.
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

## CPH number

- The three part labels stay on screen. Three unlabelled boxes under one
  legend would be harder to use than the single field they replace.
- The help names APHA documents only. A link to GOV.UK holding details waits
  for a real destination.

## Documents

- The file field is labelled "Attachment", the noun the review also uses.
- The Status column reports the virus check ("Scanning for virus", "Check
  completed"), not a verdict on the file.
- A chosen document type means a document is on its way, so Continue finishes
  a part-filled form rather than dropping it.
- The file size limit is held at 10 MB so the request stays inside the CDP
  ingress body cap.

## Transport

- The arrival date hint is a worked example of the format. The date picker's
  bounds and the out-of-range error police the window.
- The transport identification hint is a lead-in and one bullet per
  alternative, so the number of choices shows at a glance.
- The transit countries cap is not stated up front. The search goes when the
  last country is added, and the status message says why.
- The transporter list shows its facts in headed columns, with a status tag:
  green for approved, magenta for newly added.
- The list search matches name, address and approval number, ignoring case
  and accents. It is a submit on the page's own form, so it works without
  JavaScript.
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
