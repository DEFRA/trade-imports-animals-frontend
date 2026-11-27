const LOGGED_ERROR = Symbol('loggedError')

export const markErrorLogged = (error) => {
  error[LOGGED_ERROR] = true
  return error
}

export const isErrorLogged = (error) => error?.[LOGGED_ERROR] === true

export const errFieldUnlessLogged = (error) =>
  isErrorLogged(error) ? {} : { err: error }
