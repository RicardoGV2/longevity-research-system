# AGENTS.md

## Cursor Cloud specific instructions

This is a **zero-dependency static web application** (vanilla HTML/CSS/JS). There is no package manager, no build step, no linter, no test framework, and no backend.

### Running the application

Serve the `web/` directory with any static HTTP server:

```bash
python3 -m http.server 8080 --directory web
```

Then open `http://localhost:8080/` in a browser.

### Architecture notes

- All data is stored in the browser's `localStorage` (key: `longevityResearchSystem.v0.1`).
- No external APIs or databases are used.
- Deployment target is GitHub Pages (see `.github/workflows/pages.yml`), which serves the `web/` directory.
- The `schemas/`, `data/`, `examples/`, and `docs/` directories contain YAML/JSON reference data and documentation — they are not required at runtime.

### Testing

There are no automated tests. Manual browser testing is the only verification method. Key interactions to verify:
- Submitting forms on each tab (Daily Log, 7-Day Food Log, Measurements, Recipe Experiment)
- Dashboard counters update after form submissions
- Export/Import JSON round-trips data correctly
- "Clear local data" resets all counts to zero
