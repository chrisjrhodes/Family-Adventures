# Family Adventure

A lightweight family holiday photo challenge and video diary app.

## Structure

```text
/
├── index.html
├── styles.css
├── config.js
├── supabase.sql
├── js/
│   ├── app.js
│   └── data.js
└── data/
    ├── profiles.json
    └── holidays/
        └── center-parcs-2026.json
```

There is one application entry point: `js/app.js`.

## Setup

1. Copy your working Supabase URL and publishable key into `config.js`.
2. Keep `activeHoliday` set to `center-parcs-2026`.
3. Commit and push.
4. GitHub Pages will redeploy automatically.

## Future holidays

Duplicate:

`data/holidays/center-parcs-2026.json`

Rename it, edit the content, then change `activeHoliday` in `config.js`.

## Storage

Photos are compressed in the browser before being uploaded to Supabase.
Videos stay on each person's phone and are stored long-term in Google Photos.
