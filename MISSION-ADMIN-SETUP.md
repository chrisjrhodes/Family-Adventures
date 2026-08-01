# Secret Mission Admin Setup

## 1. Run the Supabase migration

Open Supabase SQL Editor and run:

`supabase-mission-admin.sql`

## 2. Set the admin PIN

In `config.js`, change:

```js
adminPin: "2468"
```

Use a PIN the children will not guess.

## 3. Deploy

Replace these files:

- index.html
- styles.css
- js/app.js
- config.js

Add:

- supabase-mission-admin.sql

Keep your real Supabase URL and publishable key in `config.js`.

## Important security note

The PIN protects the editor interface from casual access, but it is not strong backend security because this is a static public website. The Supabase policies permit anonymous updates. This is acceptable for a private family game link, but not for sensitive data.
