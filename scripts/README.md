# Scripts

Future scripts can render YAML schemas into:

- Markdown forms
- HTML forms
- PDF forms
- JSON Schema
- React components
- CSV templates

Suggested next scripts:

- `render_form_markdown.py`
- `validate_schema.py`
- `export_questions_csv.py`
- `render_measurement_catalog.py`

## First implementation idea

1. Read `schemas/medical_intake_schema.yaml`.
2. Render each module and question to Markdown.
3. Export a human-readable form to `generated/medical_intake_form.md`.
4. Later render the same schema into a web app.
