# Product direction

Build a responsive website: upload clips + audio → create → preview → download. Desktop installers, timelines, screen recording and generative video are deferred. Read docs/PROJECT.md and HANDOFF.md first.

# Working rules

- Preserve originals, license, and unrelated user work. Use a feature branch.
- Native FFmpeg belongs in the separate worker; never render in an HTTP handler or claim browser jobs continue after upload interruption.
- API and hosted Site share server/application.ts and storage ports. Site identity headers are trusted only in server/edge.ts behind Sites dispatch; local API uses sessions.
- All user operations require ownership. All worker operations require an operator secret and the current worker lease. Keep secrets out of source, logs, browser storage and provider URLs.
- Model output is data. Validate IDs, bounds, protected content and supported operations in server/plan.ts. Never execute model commands or arbitrary filters.
- AI requests reserve a durable usage entry first. Uncertain calls are never automatically replayed. A request allowance is not a monetary cap.
- Use integer milliseconds and 30 fps rational output boundaries. Update timing fixtures when changing media semantics.
- Run npm run check, npm test, npm run fixtures, npm run test:integration, npm run build:sites. Browser tests are meaningful but require supported preview/browser infrastructure; record limits honestly.
- Keep D1 migrations append-only. Add a native migration for the same schema change. Do not edit an applied migration.
- Document untested live AI, browsers, real phones and production deployment instead of claiming universal support.
