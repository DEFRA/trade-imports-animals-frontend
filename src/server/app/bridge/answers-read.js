// Optional set-owned sanitiser for answers on the read path. Default is identity;
// routes.js configures the live-animals clearer so deleted address-book references
// drop out of fulfilment/evaluation without engine importing sets/**.

let sanitizeAnswersForRead = async (_request, answers) => answers

export const configureAnswersForRead = (sanitize) => {
  sanitizeAnswersForRead = sanitize
}

export const answersForRead = (request, answers) =>
  sanitizeAnswersForRead(request, answers)
