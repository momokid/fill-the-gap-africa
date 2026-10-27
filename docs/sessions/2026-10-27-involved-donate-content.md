# Get involved cards and donate page content — 2026-10-27

## Done
- `involved_paths` repeater replaces the three hard-coded cards on `/get-involved`:
  title, icon, text, bullet points, button label and link. The first row is the
  highlighted card; the link value `mailto` resolves to the contact email.
- Donate page internals are editable: card headings and texts (Mobile Money,
  bank, international), the bank fallback note, next steps, accountability
  points, giving questions and all section headings. New repeaters:
  `donate_steps`, `donate_checks`, `donate_faq`.
- Two repeater column types in `cleanCell` (`routes/admin.js`): `lines` keeps one
  bullet per line (max 10, 160 chars each); `link` accepts a path, `https:`,
  `mailto:`/`tel:`, or the `mailto` token, and drops `javascript:` and
  protocol-relative URLs. `repeater-row.ejs` renders `lines` as a 4-row textarea.
- `npm test`: 26 route tests, all passing.

## Decisions
- Bullets live inside a card row (`lines`) instead of a second repeater: one card
  is one row, which keeps ordering and editing simple.
- `involved_paths` puts `title` first because `readRepeater` treats the first
  column as required, so a row with no title disappears.
- Link sanitising belongs in `cleanCell`, not the view, so future `link` columns
  inherit it.

## Open
- No row reordering or per-row image upload yet (next bounded task).
- The delivery ZIP in the OneDrive workspace predates this change; rebuild when
  packaging.
