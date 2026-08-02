// Scaffolded by docs/add-a-set.md step 3.
import { statusOf } from '../../../../../bridge/status/index.js'
import { collectsOf } from '../../../../../flow/dispatch.js'
import {
  commodityBasicDescriptionPage,
  commodityInputMethodPage,
  commoditySearchPage,
  commoditySummaryPage,
  varietyOfGenusAndSpeciesPage
} from '../features/commodities/page.js'
import {
  countryOfOriginPage,
  originOfImportPage
} from '../features/origin/page.js'
import { purposePage } from '../features/purpose/page.js'
import { transportBeforeBipPage } from '../features/transport/page.js'

export const taskRows = [
  { id: 'origin', pages: [countryOfOriginPage, originOfImportPage] },
  { id: 'purpose', pages: [purposePage] },
  {
    id: 'commodities',
    pages: [
      commodityInputMethodPage,
      commoditySearchPage,
      commodityBasicDescriptionPage,
      varietyOfGenusAndSpeciesPage,
      commoditySummaryPage
    ]
  },
  { id: 'transport', pages: [transportBeforeBipPage] }
]

export const taskRowById = (id) => taskRows.find((row) => row.id === id)

export const rowParts = (row) =>
  row.parts ?? row.pages.flatMap((page) => collectsOf(page.id))

export const rowStatus = (row, answers, inScope, evaluation) =>
  statusOf(rowParts(row), answers, inScope, evaluation)
