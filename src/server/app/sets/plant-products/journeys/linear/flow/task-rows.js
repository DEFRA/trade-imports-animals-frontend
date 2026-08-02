// Scaffolded by docs/add-a-set.md step 3.
import { statusOf } from '../../../../../bridge/status/index.js'
import { collectsOf } from '../../../../../flow/dispatch.js'

export const taskRows = []

export const taskRowById = (id) => taskRows.find((row) => row.id === id)

export const rowParts = (row) =>
  row.parts ?? row.pages.flatMap((page) => collectsOf(page.id))

export const rowStatus = (row, answers, inScope, evaluation) =>
  statusOf(rowParts(row), answers, inScope, evaluation)
