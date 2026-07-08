# kit is a library, not a framework

`shared/kit.js` holds independently callable helpers. A kit helper must never
accept a template/schema and render on the caller's behalf — a helper that owns
WHAT renders has crossed into engine territory and is rejected. Keep each helper
a small, composable primitive the feature controllers assemble themselves.
