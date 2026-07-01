/*
 * Reads the LHCI manifest + per-page JSON reports written by `npm run
 * lighthouse` and emits `lighthouse-report/flagged-audits.json`:
 * a per-page list of audits with score < 1 in the performance,
 * accessibility, and best-practices categories. SEO is excluded per
 * EUDPA-194 (lighthouserc.cjs asserts only the other three).
 *
 * Consumed by .github/workflows/lighthouse.yml and rendered into the
 * <!-- lighthouse-status --> PR comment by the workspace's
 * report-lighthouse-status composite action.
 */

const fs = require('fs')

const MANIFEST_PATH = 'lighthouse-report/manifest.json'
const OUTPUT_PATH = 'lighthouse-report/flagged-audits.json'
const CATEGORIES = ['performance', 'accessibility', 'best-practices']
const SCORED_DISPLAY_MODES = new Set(['numeric', 'binary'])

if (!fs.existsSync(MANIFEST_PATH)) {
  console.log(
    `No ${MANIFEST_PATH} — LHCI produced no reports; skipping flagged-audits.`
  )
  process.exit(0)
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))

const pages = manifest
  .filter((entry) => entry.isRepresentativeRun)
  .map((entry) => {
    const report = JSON.parse(fs.readFileSync(entry.jsonPath, 'utf8'))
    const audits = []
    for (const category of CATEGORIES) {
      const ref = report.categories?.[category]
      if (!ref) continue
      for (const auditRef of ref.auditRefs) {
        if (!auditRef.weight) continue
        const audit = report.audits?.[auditRef.id]
        if (!audit) continue
        if (!SCORED_DISPLAY_MODES.has(audit.scoreDisplayMode)) continue
        if (audit.score === null || audit.score >= 1) continue
        audits.push({
          auditId: audit.id,
          title: audit.title,
          score: audit.score,
          scoreDisplayMode: audit.scoreDisplayMode,
          displayValue: audit.displayValue ?? null,
          category
        })
      }
    }
    let pageUrl
    try {
      pageUrl = new URL(entry.url).pathname
    } catch {
      pageUrl = entry.url
    }
    return { pageUrl, requestedUrl: entry.url, audits }
  })

const totalAudits = pages.reduce((n, page) => n + page.audits.length, 0)

fs.writeFileSync(
  OUTPUT_PATH,
  JSON.stringify({ generatedAt: new Date().toISOString(), pages }, null, 2)
)

console.log(`Flagged audits: ${totalAudits} across ${pages.length} page(s)`)
