import Joi from 'joi'

import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import { validate } from '../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as kit from '../../../../../../../shared/kit.js'
import { hubPath, pagePath } from '../../../../../../../shared/paths.js'
import {
  isCommodityCode,
  searchSpecies
} from '../../../../../services/commodities/index.js'
import { TEMPLATES } from '../../../config.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as en } from '../copy/copy.en.js'
import { commoditySearchPage as page } from '../page.js'
import { isDuplicateCode, speciesResults, treeLevel } from './view-model.js'

export const meta = { ...page, collects: ['commodityLines'] }

const view = `${TEMPLATES}/features/commodities/search/search`
const copy = copyFor({ en, cy }).commoditySearch

const valuesFrom = (source = {}) => ({
  commoditySearchCode: String(source.commoditySearchCode ?? ''),
  speciesSearchTerm: String(source.speciesSearchTerm ?? '')
})

const codeFields = () =>
  Joi.object({
    commoditySearchCode: Joi.string()
      .trim()
      .required()
      .pattern(/^\d+$/)
      .messages({
        'string.empty': copy.errors.codeRequired,
        'any.required': copy.errors.codeRequired,
        'string.pattern.base': copy.errors.codeNumeric
      })
  }).unknown(true)

const speciesFields = () =>
  Joi.object({
    speciesSearchTerm: Joi.string().trim().required().messages({
      'string.empty': copy.errors.speciesRequired,
      'any.required': copy.errors.speciesRequired
    })
  }).unknown(true)

const pageHref = (journeyId, parentCode) => {
  const base = pagePath(journeyId, page.slug)
  return parentCode ? `${base}?parent=${encodeURIComponent(parentCode)}` : base
}

const render = (
  h,
  journey,
  {
    parentCode,
    values = valuesFrom(),
    errors = {},
    codeNoResults = false,
    results = [],
    speciesSearched = false,
    recoverableError = false
  } = {}
) => {
  const level = treeLevel(parentCode)
  return h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    formAction: pageHref(journey.journeyId, parentCode),
    speciesFormAction: `${pageHref(journey.journeyId, parentCode)}#genus-and-species-search`,
    tree: {
      crumbs: [
        {
          code: null,
          text: copy.tree.allCommodities,
          href: pageHref(journey.journeyId)
        },
        ...level.crumbs.map(({ code, description }) => ({
          code,
          text: `${code} ${description}`,
          href: pageHref(journey.journeyId, code)
        }))
      ],
      rows: level.rows.map((row) => ({
        ...row,
        href: row.isLeaf ? undefined : pageHref(journey.journeyId, row.code)
      }))
    },
    codeNoResults,
    speciesResults: results,
    speciesSearched
  })
}

const get = async (request, h) => {
  const { journey } = await state.get(request, h)
  return render(h, journey, { parentCode: request.query.parent })
}

const saveLine = async (
  request,
  h,
  { journey, answers, parentCode, values, entry, speciesEntry }
) => {
  if (isDuplicateCode(answers.commodityLines, entry.commoditySelection)) {
    return render(h, journey, {
      parentCode,
      values,
      errors: { commoditySearchCode: copy.errors.codeDuplicate }
    }).code(HTTP_STATUS_BAD_REQUEST)
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      const newIndex = await state.appendEntry(
        request,
        h,
        'commodityLines',
        entry
      )
      if (!Number.isInteger(newIndex)) {
        throw new Error('Commodity line append did not return a valid index')
      }
      if (speciesEntry) {
        const current = await state.get(request, h)
        const lines = current.answers.commodityLines ?? []
        if (newIndex < 0 || newIndex >= lines.length) {
          throw new Error('Commodity line parent index is out of range')
        }
        const speciesIndex = await state.appendEntryAt(
          request,
          h,
          ['commodityLines', newIndex, 'species'],
          speciesEntry
        )
        if (!Number.isInteger(speciesIndex)) {
          throw new Error('Species append did not return a valid index')
        }
      }
      committed = await state.get(request, h)
    },
    () =>
      render(h, journey, {
        parentCode,
        values,
        recoverableError: true
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) return failure

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = valuesFrom(payload)
  const parentCode = request.query.parent
  const { journey, answers } = await state.get(request, h)
  const addSpeciesName = Object.keys(payload).find((name) =>
    name.startsWith('add-species-')
  )

  if (addSpeciesName) {
    const speciesId = addSpeciesName.slice('add-species-'.length)
    const commodityCode = String(payload[addSpeciesName] ?? '')
    const match = searchSpecies({ genus: '' }).find(
      (candidate) =>
        candidate.speciesId === speciesId &&
        candidate.commodityCode === commodityCode
    )
    if (!match) {
      return render(h, journey, {
        parentCode,
        values,
        errors: { speciesSearchTerm: copy.speciesSearch.noResults },
        results: speciesResults(values.speciesSearchTerm),
        speciesSearched: true
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    if (isDuplicateCode(answers.commodityLines, match.commodityCode)) {
      return render(h, journey, {
        parentCode,
        values,
        errors: { speciesSearchTerm: copy.errors.codeDuplicate },
        results: speciesResults(values.speciesSearchTerm),
        speciesSearched: true
      }).code(HTTP_STATUS_BAD_REQUEST)
    }
    return saveLine(request, h, {
      journey,
      answers,
      parentCode,
      values,
      entry: { commoditySelection: match.commodityCode },
      speciesEntry: {
        eppoCode: match.eppoCode,
        genusAndSpecies: match.genusAndSpecies
      }
    })
  }

  if (payload.action === 'search-species') {
    const { value, errors } = validate(speciesFields(), payload)
    if (errors) {
      return render(h, journey, { parentCode, values, errors }).code(
        HTTP_STATUS_BAD_REQUEST
      )
    }
    return render(h, journey, {
      parentCode,
      values,
      results: speciesResults(value.speciesSearchTerm),
      speciesSearched: true
    })
  }

  const rawCode =
    payload.action === 'search-code'
      ? values.commoditySearchCode
      : String(payload['select-code'] ?? '')
  const codePayload = { ...payload, commoditySearchCode: rawCode }
  const codeValues = { ...values, commoditySearchCode: rawCode }
  const { value, errors } = validate(codeFields(), codePayload)
  if (errors) {
    return render(h, journey, {
      parentCode,
      values: codeValues,
      errors
    }).code(HTTP_STATUS_BAD_REQUEST)
  }
  const code = value.commoditySearchCode
  if (isDuplicateCode(answers.commodityLines, code)) {
    return render(h, journey, {
      parentCode,
      values: codeValues,
      errors: { commoditySearchCode: copy.errors.codeDuplicate }
    }).code(HTTP_STATUS_BAD_REQUEST)
  }
  if (!isCommodityCode(code)) {
    return render(h, journey, {
      parentCode,
      values: codeValues,
      codeNoResults: true
    })
  }
  return saveLine(request, h, {
    journey,
    answers,
    parentCode,
    values: codeValues,
    entry: { commoditySelection: code }
  })
}

export const routes = kit.pageRoutes(page, { get, post })
