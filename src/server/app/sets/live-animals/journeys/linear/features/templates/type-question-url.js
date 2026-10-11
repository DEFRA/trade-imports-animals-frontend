import { config } from '../../../../../../../../config/config.js'

const TYPE_QUESTION_PATH = '/notification-type/template'

/**
 * Where the type question for a new template lives: in the Import notification
 * service front door, in its template mode.
 *
 * @param {object} [options]
 * @param {string} [options.type] - a type to show already chosen.
 * @param {string} [options.templateId] - the template in progress, so the
 * front door can hand the next page the same one.
 * @returns {string} an absolute URL.
 */
export const templateTypeQuestionUrl = ({ type, templateId } = {}) => {
  const base = config.get('tradeImportsInsFrontend.baseUrl').replace(/\/$/, '')
  const params = new URLSearchParams({
    ...(type && { type }),
    ...(templateId && { template: templateId })
  })
  const query = params.size > 0 ? `?${params}` : ''
  return `${base}${TYPE_QUESTION_PATH}${query}`
}
