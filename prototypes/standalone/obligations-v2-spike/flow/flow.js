/**
 * The Flow — an ordered section -> pages structure. It owns SEQUENCE and
 * GATING only: no copy, no headings, no validation, no template choice
 * (those live per-page). Section grouping survives from v1 (lighter and
 * copy-free) because the journey returns to the hub after each section and
 * the hub renders one task per section.
 *
 * `gate` is a PURE read of the scope facts the state layer already
 * computed (`s.inScope` / `s.readyForQuote`) — the flow never re-derives
 * scope or mutates data.
 */
export const sections = [
  {
    id: 'email',
    pages: [{ id: 'email', slug: 'email' }]
  },
  {
    id: 'about-you-and-your-vehicle',
    pages: [
      { id: 'about-you', slug: 'about-you' },
      { id: 'your-vehicle', slug: 'your-vehicle' }
    ]
  },
  {
    id: 'your-driving-and-cover',
    pages: [
      { id: 'driving-history', slug: 'driving-history' },
      { id: 'claims', slug: 'claims', gate: (s) => s.inScope.has('claims') },
      { id: 'cover-type', slug: 'cover-type' },
      { id: 'optional-extras', slug: 'optional-extras' }
    ]
  },
  {
    id: 'add-to-your-policy',
    pages: [{ id: 'addons', slug: 'addons' }]
  },
  {
    id: 'named-driver',
    addon: 'named-driver',
    gate: (s) => s.inScope.has('driverName'),
    pages: [
      { id: 'named-driver-who', slug: 'addons/named-driver/who' },
      {
        id: 'named-driver-relationship',
        slug: 'addons/named-driver/relationship'
      }
    ]
  },
  {
    id: 'modifications',
    addon: 'modifications',
    gate: (s) => s.inScope.has('modDescription'),
    pages: [
      { id: 'modifications-describe', slug: 'addons/modifications/describe' },
      { id: 'modifications-value', slug: 'addons/modifications/value' }
    ]
  },
  {
    id: 'protected-ncd',
    addon: 'protected-ncd',
    gate: (s) => s.inScope.has('ncdYears'),
    pages: [{ id: 'protected-ncd-years', slug: 'addons/protected-ncd/years' }]
  },
  {
    id: 'get-your-quote',
    gate: (s) => s.readyForQuote,
    pages: [{ id: 'quote-summary', slug: 'quote-summary' }]
  }
]

/** Every page across all sections, flattened (order preserved). */
export const allFlowPages = sections.flatMap((section) =>
  section.pages.map((page) => ({ ...page, sectionId: section.id }))
)

export const sectionOfPage = (pageId) =>
  sections.find((section) => section.pages.some((page) => page.id === pageId))

/** Sections that must be complete for the quote to unlock (all but the quote itself). */
export const nonQuoteSections = sections.filter(
  (section) => section.id !== 'get-your-quote'
)
