# Foundation step 1

Add `js/state.js` and `js/supabase-client.js`.

At the top of `js/app.js`, replace the current Supabase setup and `state`
object with:

```js
import { loadAppData } from "./data.js";
import {
  state,
  setActiveExplorer,
  clearActiveExplorer,
  setActiveDay,
  setParentSession,
  clearParentSession
} from "./state.js";
import {
  hasSupabase,
  supabaseClient,
  requireSupabase
} from "./supabase-client.js";

const app = document.getElementById("app");
const cfg = window.APP_CONFIG || {};
```

Keep the existing `PROFILES`, `HOLIDAY`, `DAYS`, mission override and
assignment variables immediately below those lines.

Then make these three replacements.

## Successful Explorer PIN

Replace the direct `state.profileId` and localStorage writes with:

```js
setActiveExplorer(profileId);
```

## End Adventure

Replace the clearing block with:

```js
clearActiveExplorer();
renderPicker();
```

## Changing day

Replace the direct `state.dayIndex` and localStorage writes with:

```js
setActiveDay(
  (state.dayIndex + delta + DAYS.length) % DAYS.length
);
```

Do not change anything else in this step.
