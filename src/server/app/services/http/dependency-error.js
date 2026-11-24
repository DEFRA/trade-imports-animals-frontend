/**
 * A dependency's refusal of a call: it answered with a status that was not
 * ok. The message names the dependency and the action, such as
 * `animals-backend refused to get document upload status: 503 Service Unavailable`;
 * `dependency` and `operation` carry the call, and `status` and `statusText`
 * carry the answer.
 */
export class RefusedCallError extends Error {
  /**
   * @param {{ dependency: string, operation: string, action?: string }} call - the call refused: the dependency, its metric operation id, and the action in words, which defaults to the operation id read as words
   * @param {{ status: number, statusText: string }} response - the dependency's answer
   */
  constructor(
    { dependency, operation, action = operation.replaceAll('-', ' ') },
    { status, statusText }
  ) {
    super(`${dependency} refused to ${action}: ${status} ${statusText}`)
    this.name = 'RefusedCallError'
    this.dependency = dependency
    this.operation = operation
    this.status = status
    this.statusText = statusText
  }
}
