# Live animals test responsibility matrix

This matrix assigns one primary owner to each behaviour at the frontend/backend
boundary. Other layers may retain small seam checks, but should not repeat the
primary layer's detailed assertions.

| Behaviour                    | Primary owner layer    | Coverage boundary                                                        |
| ---------------------------- | ---------------------- | ------------------------------------------------------------------------ |
| Routes and navigation        | Frontend canned        | Page routing, links, redirects, back/cancel paths and journey sequencing |
| Obligations and validation   | Frontend canned        | Gating, conditional questions, error summaries and field errors          |
| Lifecycle UI                 | Frontend canned        | Draft, submit, view, amend, cancel amendment, copy and delete surfaces   |
| Multi-tab isolation          | Frontend canned        | Independent notification state within one browser session                |
| Documents client             | Frontend canned        | Upload, scan polling, status, removal and file-view behaviour            |
| Dashboard paging and sorting | Frontend canned        | Paged rows, ordering, controls and notification actions                  |
| Accessibility                | Frontend canned        | WCAG 2 A/AA axe scans of distinct deterministic page states              |
| Mapper A contract            | Frontend contract/unit | Exact `PUT /notifications` payload and agreed enum vocabularies          |
| Real Defra ID and session    | Tests-repo integrated  | Authentication hand-off and real session continuity                      |
| Backend ownership/lifecycle  | Backend contract/IT    | Persistence ownership, lifecycle transitions and backend invariants      |
| Cross-browser                | Tests-repo integrated  | Thin end-to-end coverage in the supported browser set                    |
| Deployed accessibility smoke | Tests-repo integrated  | A small accessibility check against the deployed integrated service      |

“Frontend canned” means the deterministic STUB-mode `prototype` Playwright
project in this repository. The tests repo work in pr-012 verifies integrated
seams; it does not duplicate the detailed canned assertions owned here.
