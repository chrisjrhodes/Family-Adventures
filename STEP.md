# Explorer access extraction

## 1. Add the new file

Copy:

`js/access.js`

into your project.

## 2. Update the imports in `js/app.js`

Add:

```js
import { createAccessController } from "./access.js";
```

Remove `setActiveExplorer` from the `state.js` import because `access.js`
now owns successful Explorer login.

Remove `requireSupabase` from the `supabase-client.js` import if nothing else
in `app.js` uses it.

Your state import should still include:

```js
state,
clearActiveExplorer,
setActiveDay,
setParentSession,
clearParentSession
```

Your Supabase import should still include:

```js
hasSupabase,
supabaseClient
```

## 3. Declare the controller

Below the mission data variables, add:

```js
let access;
```

For example:

```js
let SECRET_ASSIGNMENTS = {};
let SECRET_PHOTOS = [];
let access;
```

## 4. Delete two functions from `app.js`

Delete the complete functions:

```js
function renderPicker() {
  ...
}
```

and:

```js
function renderPinScreen(...) {
  ...
}
```

Do not leave partial copies behind.

## 5. Create the controller during app initialisation

Inside `initialiseApp()`, after these values have been assigned:

```js
PROFILES = data.profiles;
HOLIDAY = data.holiday;
DAYS = HOLIDAY.days;
```

add:

```js
access = createAccessController({
  app,
  getProfiles: () => PROFILES,
  getHoliday: () => HOLIDAY,
  setTheme,
  onExplorerAuthenticated: () => renderDashboard()
});
```

This must happen before the code decides whether to show the dashboard or
the picker.

## 6. Replace picker calls

Replace every remaining call:

```js
renderPicker()
```

with:

```js
access.renderPicker()
```

Likely locations include:

### Invalid or missing profile in `renderDashboard`

```js
if (!profile) return access.renderPicker();
```

### End Adventure

```js
tpl.querySelector("#switch-profile").onclick = () => {
  clearActiveExplorer();
  access.renderPicker();
};
```

### Parent Mode back navigation

```js
if (returnTo === "picker" || !state.profileId) {
  access.renderPicker();
} else {
  renderDashboard();
}
```

### Initial application route

```js
if (state.profileId && PROFILES[state.profileId]) {
  renderDashboard();
} else {
  access.renderPicker();
}
```

## 7. Do not change anything else

Do not move:

- dashboard rendering
- Parent Mode
- missions
- uploads
- gallery
- photo compression

Those are separate refactor steps.

## 8. Test

- Profile picker loads
- Each profile opens the PIN screen
- Wrong PIN is rejected
- Correct PIN opens the dashboard
- Parent PIN override works
- Refresh remembers the Explorer
- End Adventure returns to the picker
- Parent Mode back navigation works

## 9. Commit

```bash
git add js/app.js js/access.js
git commit -m "refactor: extract Explorer access flow"
git push
```
