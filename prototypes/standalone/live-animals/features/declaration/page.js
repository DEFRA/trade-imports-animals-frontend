/**
 * Import-free data leaf — importing a controller here (or in flow.js)
 * creates the load cycle flow -> controller -> engine -> status -> flow
 * and leaves `sections` undefined at boot.
 *
 * Spec identity: page `declaration` in the "Check and submit" (review)
 * section — the end of the journey per c-022: hub -> check your answers ->
 * declaration -> submitted, with no separate confirmation page.
 */
export const declarationPage = {
  id: 'declaration',
  slug: 'declaration'
}
