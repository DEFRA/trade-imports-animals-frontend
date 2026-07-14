import { hubPath, pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import * as kit from '../../shared/kit.js'
import { documentsPage as page } from './page.js'
import { obligations } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/documents/list`

export const documentValue = (entry) => {
  const type = (entry.accompanyingDocumentType ?? '').trim() || 'Not provided'
  const reference = (entry.accompanyingDocumentReference ?? '').trim()
  return reference ? `${type} — ${reference}` : type
}

const get = async (request, h) => {
  const { answers } = await state.get(request, h)
  const rows = state
    .collectionView(answers, ['documents'])
    .map(({ index, entry }) => ({
      key: { text: `Document ${index + 1}` },
      value: { text: documentValue(entry) },
      actions: {
        items: [
          {
            href: pagePath(`accompanying-documents/${index}/remove`),
            text: 'Remove',
            visuallyHiddenText: `document ${index + 1}`
          }
        ]
      }
    }))
  return h.view(view, {
    ...kit.base('Upload documents', { backLink: hubPath() }),
    heading: 'Upload documents',
    rows,
    hasDocuments: rows.length > 0,
    addButtonText: rows.length ? 'Add another document' : 'Add a document',
    emptyText: 'You have not added any documents yet.'
  })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  if (payload.action === 'add') {
    return h.redirect(pagePath('accompanying-documents/add'))
  }
  const { scope } = await state.get(request, h)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
