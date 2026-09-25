// The model resolves only within model/ or through a services/<name>/index.js
// barrel (see `model-import-boundary` in .dependency-cruiser.cjs). The manifest
// needs the active set to know which obligations to answer with, so it reaches
// set-context through this barrel rather than punching through the boundary.
export { currentSetId, setKeyed } from '../../shared/set-context.js'
