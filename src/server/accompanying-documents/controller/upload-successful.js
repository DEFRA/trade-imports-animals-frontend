// EUDPA-106 Option 3-with-callbacks: landing endpoint for the cdp-uploader
// redirect. Under this shape the backend record is created by cdp-uploader's
// callback (not by any frontend polling), so this handler has nothing to
// reconcile — it just bounces back to the accompanying-documents page, which
// reads from the backend and renders the doc once the callback has landed.
//
// The known limitation: if the callback hasn't arrived by the time the user
// lands on /accompanying-documents, they see no in-flight entry until they
// refresh. Option 8 (register call at page render) is captured as a follow-up
// stretch that closes that window with a visible "Checking" record.
export const uploadSuccessfulHandler = async (_request, h) => {
  return h.redirect('/accompanying-documents')
}
