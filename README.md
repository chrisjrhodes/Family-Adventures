# Family Adventure

A reusable family holiday photo challenge and video diary app.

## Fast setup

1. Create a new Supabase project.
2. Open **SQL Editor** and run `supabase.sql`.
3. Open **Storage** and create a public bucket called `adventure-media`.
4. In Supabase project settings, copy:
   - Project URL
   - Anon public key
5. Paste both values into `config.js`.
6. Commit these files to GitHub.
7. Turn on GitHub Pages:
   - Settings
   - Pages
   - Deploy from branch
   - `main` / root

## Profiles

- Jacob: green and brown
- Caitlin: purple and turquoise
- Esmae: pink and purple
- Jess
- Chris
- Grandad

## Important

This is designed for a private family holiday, but the simple setup uses a public Supabase bucket and anonymous inserts. Anyone who discovers the site URL could technically upload or view media.

For a stricter version, add Supabase Auth or a shared PIN before the holiday.


## Branding

The app is branded as **Family Adventure** so it works for a blended family and can be reused for future trips. The current trip subtitle is **Center Parcs 2026**.
