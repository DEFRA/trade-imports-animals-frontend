import { getTraceId } from '@defra/hapi-tracing'
import {
  operatorsClient,
  fromApiOperator
} from '../../common/clients/operators-client.js'
import { setSessionValue } from '../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../common/constants/session-keys.js'
import { statusCodes } from '../../common/constants/status-codes.js'

const PAGE_TITLE = 'Delete operator'
const VIEW = 'address-book/delete/index'
const LIST_PATH = '/address-book'

function getIdentity(request) {
  const profile = request.auth?.credentials?.profile ?? {}
  return { crn: profile.crn, organisationId: profile.organisationId }
}

function renderNotFound(h) {
  return h
    .view('error/index', {
      pageTitle: 'Page not found',
      heading: statusCodes.notFound,
      message: 'Page not found'
    })
    .code(statusCodes.notFound)
}

/**
 * Delete-an-operator confirmation page — GET+POST
 * /address-book/{operatorId}/delete. The delete is never reached without the
 * confirmation POST (c-010).
 */
export const deleteOperatorController = {
  get: {
    async handler(request, h) {
      const { operatorId } = request.params
      const traceId = getTraceId() ?? ''
      const identity = getIdentity(request)

      let apiOperator
      try {
        apiOperator = await operatorsClient.getOperator(
          traceId,
          identity,
          operatorId
        )
      } catch (err) {
        if (err.status === statusCodes.notFound) {
          return renderNotFound(h)
        }
        throw err
      }

      const operator = fromApiOperator(apiOperator)

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        heading: PAGE_TITLE,
        operatorName: operator.name,
        formAction: `${LIST_PATH}/${operatorId}/delete`,
        cancelHref: `${LIST_PATH}/${operatorId}`
      })
    }
  },
  post: {
    async handler(request, h) {
      const { operatorId } = request.params
      const payload = request.payload ?? {}

      if (payload.action === 'cancel') {
        return h.redirect(`${LIST_PATH}/${operatorId}`)
      }

      const traceId = getTraceId() ?? ''
      const identity = getIdentity(request)

      await operatorsClient.deleteOperator(traceId, identity, operatorId)

      setSessionValue(
        request,
        sessionKeys.addressBookBanner,
        `${payload.name} operator deleted`
      )

      return h.redirect(LIST_PATH)
    }
  }
}
