const ACTIVE_EXPLORER_KEY = "family-adventure-active-explorer";
const ACTIVE_DAY_KEY = "family-adventure-day";

export const state = {
  profileId: localStorage.getItem(ACTIVE_EXPLORER_KEY),
  pendingProfileId: null,
  dayIndex: Number(localStorage.getItem(ACTIVE_DAY_KEY) || 0),
  photoFile: null,
  galleryDay: 0,
  parentUnlocked: false,
  parentToken: null
};

export function setActiveExplorer(profileId) {
  state.profileId = profileId;
  state.pendingProfileId = null;
  localStorage.setItem(ACTIVE_EXPLORER_KEY, profileId);
}

export function clearActiveExplorer() {
  state.profileId = null;
  state.pendingProfileId = null;
  state.parentUnlocked = false;
  state.parentToken = null;
  localStorage.removeItem(ACTIVE_EXPLORER_KEY);
}

export function setActiveDay(dayIndex) {
  state.dayIndex = dayIndex;
  localStorage.setItem(ACTIVE_DAY_KEY, String(dayIndex));
}

export function setParentSession(token) {
  state.parentUnlocked = Boolean(token);
  state.parentToken = token || null;
}

export function clearParentSession() {
  state.parentUnlocked = false;
  state.parentToken = null;
}
