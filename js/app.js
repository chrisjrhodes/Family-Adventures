import { loadAppData } from "./data.js";

import {
  state,
  clearActiveExplorer,
  setActiveDay,
  setParentSession,
  clearParentSession
} from "./state.js";

import {
  hasSupabase,
  supabaseClient,
} from "./supabase-client.js";

import { createAccessController } from "./access.js";

const app = document.getElementById("app");
const cfg = window.APP_CONFIG || {};

let PROFILES = {};
let HOLIDAY = null;
let DAYS = [];
let MISSION_OVERRIDES = {};
let DAILY_OVERRIDES = {};
let SECRET_ASSIGNMENTS = {};
let SECRET_PHOTOS = [];
let access;

function setTheme(profile) {
  document.documentElement.style.setProperty("--accent", profile.colours[0]);
  document.documentElement.style.setProperty("--accent-2", profile.colours[1]);
  document
    .querySelector('meta[name="theme-color"]')
    .setAttribute("content", profile.colours[0]);
}

function photoKey(dayIndex = state.dayIndex) {
  return `family-adventure-${HOLIDAY.id}-${state.profileId}-${dayIndex}-photo`;
}

function videoKey(dayIndex = state.dayIndex) {
  return `family-adventure-${HOLIDAY.id}-${state.profileId}-${dayIndex}-video`;
}

function getSecretMission(profileId) {
  const assignment = SECRET_ASSIGNMENTS[profileId];
  if (!assignment) {
    return MISSION_OVERRIDES[profileId] || PROFILES[profileId]?.secret || "";
  }

  const subjectName = PROFILES[assignment.subject_profile_id]?.name || "your assigned person";
  return `Capture ${subjectName} with every other member of the family. Complete all five photo slots.`;
}

function getDay(dayIndex) {
  const original = DAYS[dayIndex];
  const override = DAILY_OVERRIDES[dayIndex];

  return override
    ? {
        ...original,
        theme: override.theme,
        photo: override.photo_instruction,
        video: override.video_question
      }
    : original;
}

async function loadMissionData() {
  if (!hasSupabase) {
    return {
      missionOverrides: {},
      dailyOverrides: {},
      assignments: {},
      secretPhotos: []
    };
  }

  const [missionsResult, dailyResult, assignmentsResult, photosResult] =
    await Promise.all([
      supabaseClient
        .from("secret_missions")
        .select("profile_id, mission")
        .eq("holiday_id", HOLIDAY.id),

      supabaseClient
        .from("daily_missions")
        .select("day_index, theme, photo_instruction, video_question")
        .eq("holiday_id", HOLIDAY.id),

      supabaseClient
        .from("secret_assignments")
        .select("explorer_profile_id, subject_profile_id")
        .eq("holiday_id", HOLIDAY.id),

      supabaseClient
        .from("secret_photos")
        .select("*")
        .eq("holiday_id", HOLIDAY.id)
    ]);

  for (const result of [
    missionsResult,
    dailyResult,
    assignmentsResult,
    photosResult
  ]) {
    if (result.error) {
      console.warn("Could not load mission data", result.error);
    }
  }

  return {
    missionOverrides: Object.fromEntries(
      (missionsResult.data || []).map(row => [row.profile_id, row.mission])
    ),
    dailyOverrides: Object.fromEntries(
      (dailyResult.data || []).map(row => [row.day_index, row])
    ),
    assignments: Object.fromEntries(
      (assignmentsResult.data || []).map(row => [
        row.explorer_profile_id,
        row
      ])
    ),
    secretPhotos: photosResult.data || []
  };
}

function getSecretPairings(explorerProfileId) {
  const assignment = SECRET_ASSIGNMENTS[explorerProfileId];
  if (!assignment) return [];

  const subjectId = assignment.subject_profile_id;

  return Object.keys(PROFILES)
    .filter(profileId => profileId !== subjectId)
    .map(partnerId => ({
      subjectId,
      partnerId,
      subjectName: PROFILES[subjectId].name,
      partnerName: PROFILES[partnerId].name
    }));
}

function getSecretPhoto(explorerProfileId, partnerId) {
  return SECRET_PHOTOS.find(
    photo =>
      photo.explorer_profile_id === explorerProfileId &&
      photo.partner_profile_id === partnerId
  );
}



async function renderDashboard() {
  const profile = PROFILES[state.profileId];
  if (!profile) return access.renderPicker();

  setTheme(profile);

  const day = getDay(state.dayIndex);
  const tpl = document
    .getElementById("dashboard-template")
    .content.cloneNode(true);

  tpl.querySelector("#welcome-title").textContent = profile.name;
  tpl.querySelector("#explorer-role").textContent =
    `${profile.icon} ${profile.role}`;
  tpl.querySelector("#avatar").textContent = profile.name[0];
  tpl.querySelector("#avatar").style.background = profile.colours[0];
  tpl.querySelector("#day-label").textContent = day.day;
  tpl.querySelector("#day-theme").textContent = day.theme;
  tpl.querySelector("#mission-number").textContent =
    String(state.dayIndex + 1).padStart(2, "0");
  tpl.querySelector("#photo-title").textContent = day.theme;
  tpl.querySelector("#photo-copy").textContent = day.photo;
  tpl.querySelector("#video-question").textContent = day.video;
  tpl.querySelector("#secret-mission").textContent = getSecretMission(state.profileId);
  buildSecretChecklist(tpl.querySelector("#secret-checklist"));

  tpl.querySelector("#switch-profile").onclick = () => { clearActiveExplorer(); access.renderPicker(); };

  tpl.querySelector("#prev-day").onclick = () => changeDay(-1);
  tpl.querySelector("#next-day").onclick = () => changeDay(1);
  tpl.querySelector("#open-gallery").onclick = renderGallery;
  tpl.querySelector("#open-parent-mode").onclick = () => renderParentMode("dashboard");

  const secretButton = tpl.querySelector("#reveal-secret");
  const secretContent = tpl.querySelector("#secret-content");

  secretButton.onclick = () => {
    secretButton.classList.add("hidden");
    secretContent.classList.remove("hidden");
  };

  const photoInput = tpl.querySelector("#photo-input");
  const photoPreview = tpl.querySelector("#photo-preview");
  const savePhoto = tpl.querySelector("#save-photo");

  photoInput.onchange = () => {
    state.photoFile = photoInput.files[0] || null;
    if (!state.photoFile) return;

    photoPreview.innerHTML =
      `<img alt="Selected mission photo" src="${URL.createObjectURL(state.photoFile)}">`;

    photoPreview.classList.remove("hidden");
    savePhoto.classList.remove("hidden");
  };

  savePhoto.onclick = async () => savePhotoMission(state.photoFile, savePhoto);

  const toggleVideo = tpl.querySelector("#toggle-video");

  toggleVideo.onclick = () => {
    const complete = !localStorage.getItem(videoKey());

    if (complete) localStorage.setItem(videoKey(), "1");
    else localStorage.removeItem(videoKey());

    updateProgressUI();
    updateOverallProgress();
  };

  app.replaceChildren(tpl);
  await refreshPhotoStatus();
  updateProgressUI();
  updateOverallProgress();
}

function changeDay(delta) {
  setActiveDay(
    (state.dayIndex + delta + DAYS.length) % DAYS.length
  );

  state.photoFile = null;
  renderDashboard();
}

async function refreshPhotoStatus() {
  if (!hasSupabase) return;

  const { data, error } = await supabaseClient
    .from("entries")
    .select("id")
    .eq("profile_id", state.profileId)
    .eq("day_index", state.dayIndex)
    .eq("media_type", "photo")
    .limit(1);

  if (!error && data?.length) {
    localStorage.setItem(photoKey(), "1");
  }
}

function updateProgressUI() {
  const photoDone = Boolean(localStorage.getItem(photoKey()));
  const videoDone = Boolean(localStorage.getItem(videoKey()));

  document.getElementById("photo-dot")
    ?.classList.toggle("complete", photoDone);

  document.getElementById("video-dot")
    ?.classList.toggle("complete", videoDone);

  const photoProgress = document.getElementById("photo-progress");
  const videoButton = document.getElementById("toggle-video");
  const dayComplete = document.getElementById("day-complete");

  if (photoProgress) {
    photoProgress.textContent =
      photoDone ? "✓ Photo mission complete" : "○ Awaiting photo";
    photoProgress.classList.toggle("complete", photoDone);
  }

  if (videoButton) {
    videoButton.textContent =
      videoDone ? "Recorded ✓" : "Mark as recorded";
    videoButton.classList.toggle("complete", videoDone);
  }

  dayComplete?.classList.toggle("hidden", !(photoDone && videoDone));
}

function updateOverallProgress() {
  let completed = 0;

  for (let i = 0; i < DAYS.length; i++) {
    if (
      localStorage.getItem(photoKey(i)) &&
      localStorage.getItem(videoKey(i))
    ) {
      completed++;
    }
  }

  const count = document.getElementById("progress-count");

  if (count) {
    count.innerHTML =
      `<strong>${completed}/${DAYS.length}</strong><span>days complete</span>`;
  }
}

async function compressPhoto(file, maxDimension = 1600, quality = 0.82) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height)
  );

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      value =>
        value
          ? resolve(value)
          : reject(new Error("Photo compression failed")),
      "image/jpeg",
      quality
    );
  });

  return new File(
    [blob],
    `mission-${Date.now()}.jpg`,
    { type: "image/jpeg" }
  );
}

async function savePhotoMission(file, button) {
  if (!file) return;

  button.disabled = true;
  button.textContent = "Preparing photo...";

  try {
    if (!hasSupabase) {
      throw new Error("Supabase is not connected.");
    }

    const compressed = await compressPhoto(file);
    button.textContent = "Uploading...";

    const path =
      `${HOLIDAY.id}/${state.profileId}/day-${state.dayIndex + 1}/photo-${Date.now()}.jpg`;

    const { error: uploadError } = await supabaseClient.storage
      .from("adventure-media")
      .upload(path, compressed, {
        upsert: false,
        contentType: "image/jpeg"
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabaseClient.storage
      .from("adventure-media")
      .getPublicUrl(path);

    const { error: dbError } = await supabaseClient
      .from("entries")
      .insert({
        profile_id: state.profileId,
        profile_name: PROFILES[state.profileId].name,
        day_index: state.dayIndex,
        media_type: "photo",
        media_url: publicData.publicUrl,
        theme: getDay(state.dayIndex).theme
      });

    if (dbError) throw dbError;

    localStorage.setItem(photoKey(), "1");
    state.photoFile = null;
    renderDashboard();
  } catch (error) {
    console.error(error);
    alert(`Could not save photo: ${error.message}`);
    button.disabled = false;
    button.textContent = "Submit mission photo";
  }
}



function buildSecretChecklist(container) {
  container.replaceChildren();

  const pairings = getSecretPairings(state.profileId);

  if (!pairings.length) {
    container.innerHTML =
      `<p class="secret-empty">Your secret photo assignment has not been set yet.</p>`;
    return;
  }

  pairings.forEach(pairing => {
    const existing = getSecretPhoto(state.profileId, pairing.partnerId);
    const row = document.createElement("div");
    row.className = `secret-slot ${existing ? "complete" : ""}`;

    row.innerHTML = `
      <div class="secret-slot-copy">
        <span class="progress-dot ${existing ? "complete" : ""}"></span>
        <div>
          <strong>${pairing.subjectName} + ${pairing.partnerName}</strong>
          <small>${existing ? "Photo captured ✓" : "Photo still needed"}</small>
        </div>
      </div>
      ${
        existing
          ? `<img src="${existing.media_url}" alt="${pairing.subjectName} and ${pairing.partnerName}">`
          : `<label class="secret-upload-button">
               Add photo
               <input type="file" accept="image/*">
             </label>`
      }
    `;

    if (!existing) {
      const input = row.querySelector("input");
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        await saveSecretPhoto(pairing, file, row);
      };
    }

    container.appendChild(row);
  });

  const completed = pairings.filter(pairing =>
    getSecretPhoto(state.profileId, pairing.partnerId)
  ).length;

  const progress = document.createElement("div");
  progress.className = "secret-total";
  progress.textContent = `${completed} / ${pairings.length} secret photos complete`;
  container.prepend(progress);
}

async function saveSecretPhoto(pairing, file, row) {
  row.classList.add("saving");

  try {
    if (!hasSupabase) {
      throw new Error("Supabase is not connected.");
    }

    const compressed = await compressPhoto(file);
    const path =
      `${HOLIDAY.id}/${state.profileId}/secret/${pairing.partnerId}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabaseClient.storage
      .from("adventure-media")
      .upload(path, compressed, {
        upsert: false,
        contentType: "image/jpeg"
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabaseClient.storage
      .from("adventure-media")
      .getPublicUrl(path);

    const rowData = {
      holiday_id: HOLIDAY.id,
      explorer_profile_id: state.profileId,
      subject_profile_id: pairing.subjectId,
      partner_profile_id: pairing.partnerId,
      media_url: publicData.publicUrl,
      storage_path: path
    };

    const { data, error } = await supabaseClient
      .from("secret_photos")
      .upsert(rowData, {
        onConflict:
          "holiday_id,explorer_profile_id,partner_profile_id"
      })
      .select()
      .single();

    if (error) throw error;

    SECRET_PHOTOS = SECRET_PHOTOS.filter(
      photo =>
        !(
          photo.explorer_profile_id === state.profileId &&
          photo.partner_profile_id === pairing.partnerId
        )
    );
    SECRET_PHOTOS.push(data);

    renderDashboard();
  } catch (error) {
    console.error(error);
    alert(`Could not save secret photo: ${error.message}`);
    row.classList.remove("saving");
  }
}

function renderParentMode(returnTo = "dashboard") {
  const tpl = document
    .getElementById("parent-template")
    .content.cloneNode(true);

  const backButton = tpl.querySelector("#back-from-parent");
  const pinInput = tpl.querySelector("#parent-pin");
  const unlockButton = tpl.querySelector("#unlock-parent");

  backButton.onclick = () => {
    if (returnTo === "picker" || !state.profileId) {
      access.renderPicker();
    } else {
      renderDashboard();
    }
  };

  // Put the template into the real document before attempting
  // to populate any of its dynamic forms.
  app.replaceChildren(tpl);

  const parentLock = document.getElementById("parent-lock");
  const parentContent = document.getElementById("parent-content");
  const error = document.getElementById("parent-error");

  const unlock = async () => {
    error.classList.add("hidden");
    unlockButton.disabled = true;
    unlockButton.textContent = "Checking...";

    try {
      const { data, error: rpcError } = await supabaseClient.rpc(
        "create_parent_session",
        {
          entered_pin: pinInput.value.trim()
        }
      );

      if (rpcError) throw rpcError;

      if (!data) {
        throw new Error("That Parent PIN is not correct.");
      }

      setParentSession(data);

      parentLock.classList.add("hidden");
      parentContent.classList.remove("hidden");

      initialiseParentTabs();
    } catch (unlockError) {
      error.textContent = unlockError.message;
      error.classList.remove("hidden");
      unlockButton.disabled = false;
      unlockButton.textContent = "Open Parent Mode";
    }
  };

  unlockButton.onclick = unlock;

  pinInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      unlock();
    }
  });

  if (state.parentUnlocked && state.parentToken) {
    parentLock.classList.add("hidden");
    parentContent.classList.remove("hidden");
    initialiseParentTabs();
  } else {
    pinInput.focus();
  }
}
function initialiseParentTabs() {
  const buttons = [...document.querySelectorAll(".admin-tab")];

  buttons.forEach(button => {
    button.onclick = () => {
      buttons.forEach(item => item.classList.remove("active"));
      button.classList.add("active");

      document.querySelectorAll(".admin-panel").forEach(panel => {
        panel.classList.toggle(
          "hidden",
          panel.id !== `parent-panel-${button.dataset.tab}`
        );
      });
    };
  });

  buildParentProgress();
  buildDailyMissionEditor();
  buildAssignmentEditor();
  buildPinManager();

  const refreshButton = document.getElementById("refresh-progress");

  if (refreshButton) {
    refreshButton.onclick = buildParentProgress;
  }
}
async function buildParentProgress(){const grid=document.getElementById("parent-progress-grid");if(!grid)return;grid.innerHTML='<p class="empty-state">Loading progress...</p>';const [d,s]=await Promise.all([supabaseClient.from("entries").select("profile_id,day_index,media_type").eq("media_type","photo"),supabaseClient.from("secret_photos").select("explorer_profile_id,partner_profile_id").eq("holiday_id",HOLIDAY.id)]);if(d.error||s.error){grid.innerHTML='<p class="admin-error">Could not load progress.</p>';return;}grid.replaceChildren();Object.entries(PROFILES).forEach(([id,p])=>{const photos=new Set((d.data||[]).filter(x=>x.profile_id===id).map(x=>x.day_index)).size;let videos=0;for(let i=0;i<DAYS.length;i++)if(localStorage.getItem(`family-adventure-${HOLIDAY.id}-${id}-${i}-video`))videos++;const secrets=new Set((s.data||[]).filter(x=>x.explorer_profile_id===id).map(x=>x.partner_profile_id)).size;const card=document.createElement("article");card.className="parent-progress-card";card.innerHTML=`<div class="parent-progress-heading"><span>${p.icon}</span><div><strong>${p.name}</strong><small>${p.role}</small></div></div><div class="parent-progress-stats"><div><strong>${photos}/${DAYS.length}</strong><span>daily photos</span></div><div><strong>${videos}/${DAYS.length}</strong><span>videos on this device</span></div><div><strong>${secrets}/5</strong><span>secret photos</span></div></div>`;grid.appendChild(card);});}
function buildDailyMissionEditor() {
  const form = document.getElementById("daily-missions-form");

  if (!form) return;

  form.replaceChildren();

  DAYS.forEach((originalDay, dayIndex) => {
    const day = getDay(dayIndex);
    const card = document.createElement("section");

    card.className = "mission-editor-card daily-editor-card";

    card.innerHTML = `
      <div class="mission-editor-heading">
        <span class="mission-editor-icon">${dayIndex + 1}</span>
        <div>
          <strong>${originalDay.day}</strong>
          <small>Daily mission and video prompt</small>
        </div>
      </div>

      <label>
        <span>Theme</span>
        <input
          name="theme-${dayIndex}"
          maxlength="80"
        >
      </label>

      <label>
        <span>Photo instruction</span>
        <textarea
          name="photo-${dayIndex}"
          rows="3"
          maxlength="240"
        ></textarea>
      </label>

      <label>
        <span>Video question</span>
        <textarea
          name="video-${dayIndex}"
          rows="2"
          maxlength="180"
        ></textarea>
      </label>
    `;

    card.querySelector(
      `[name="theme-${dayIndex}"]`
    ).value = day.theme;

    card.querySelector(
      `[name="photo-${dayIndex}"]`
    ).value = day.photo;

    card.querySelector(
      `[name="video-${dayIndex}"]`
    ).value = day.video;

    form.appendChild(card);
  });

  const saveButton =
    document.getElementById("save-daily-missions");

  if (saveButton) {
    saveButton.onclick = saveDailyMissionOverrides;
  }
}

async function saveDailyMissionOverrides() {
  const form =
    document.getElementById("daily-missions-form");

  const button =
    document.getElementById("save-daily-missions");

  const result =
    document.getElementById("daily-save-result");

  if (!form || !button || !result) return;

  button.disabled = true;
  button.textContent = "Saving...";
  result.classList.add("hidden");

  try {
    const rows = DAYS.map((day, dayIndex) => ({
      holiday_id: HOLIDAY.id,
      day_index: dayIndex,
      theme:
        form.elements[`theme-${dayIndex}`].value.trim(),
      photo_instruction:
        form.elements[`photo-${dayIndex}`].value.trim(),
      video_question:
        form.elements[`video-${dayIndex}`].value.trim()
    }));

    const incomplete = rows.some(row =>
      !row.theme ||
      !row.photo_instruction ||
      !row.video_question
    );

    if (incomplete) {
      throw new Error(
        "Every daily mission field must be completed."
      );
    }

    const { data, error } = await supabaseClient
      .from("daily_missions")
      .upsert(rows, {
        onConflict: "holiday_id,day_index"
      })
      .select();

    if (error) throw error;

    DAILY_OVERRIDES = Object.fromEntries(
      data.map(row => [row.day_index, row])
    );

    result.textContent = "Daily missions saved ✓";
    result.classList.remove("hidden");
  } catch (error) {
    console.error("Could not save daily missions", error);

    result.textContent =
      `Could not save: ${error.message}`;

    result.classList.remove("hidden");
  } finally {
    button.disabled = false;
    button.textContent = "Save daily missions";
  }
}

function buildAssignmentEditor() {
  const form =
    document.getElementById("assignments-form");

  if (!form) return;

  form.replaceChildren();

  Object.entries(PROFILES).forEach(
    ([explorerId, explorer]) => {
      const card = document.createElement("section");

      card.className = "mission-editor-card";

      const options = Object.entries(PROFILES)
        .map(
          ([subjectId, subject]) =>
            `<option value="${subjectId}">
              ${subject.name}
            </option>`
        )
        .join("");

      card.innerHTML = `
        <div class="mission-editor-heading">
          <span class="mission-editor-icon">
            ${explorer.icon}
          </span>
          <div>
            <strong>${explorer.name}</strong>
            <small>
              Who must they photograph with everyone?
            </small>
          </div>
        </div>

        <label>
          <span>Assigned subject</span>
          <select name="${explorerId}">
            ${options}
          </select>
        </label>

        <p class="assignment-preview"></p>
      `;

      const select = card.querySelector("select");
      const preview =
        card.querySelector(".assignment-preview");

      select.value =
        SECRET_ASSIGNMENTS[explorerId]
          ?.subject_profile_id || explorerId;

      const updatePreview = () => {
        const subjectName =
          PROFILES[select.value].name;

        preview.textContent =
          `${explorer.name} must collect five photos ` +
          `of ${subjectName}, one with each other ` +
          `family member.`;
      };

      select.onchange = updatePreview;
      updatePreview();

      form.appendChild(card);
    }
  );

  const saveButton =
    document.getElementById("save-assignments");

  if (saveButton) {
    saveButton.onclick = saveSecretAssignments;
  }
}

async function saveSecretAssignments() {
  const form =
    document.getElementById("assignments-form");

  const button =
    document.getElementById("save-assignments");

  const result =
    document.getElementById("assignment-save-result");

  if (!form || !button || !result) return;

  button.disabled = true;
  button.textContent = "Saving...";
  result.classList.add("hidden");

  try {
    const rows = Object.keys(PROFILES).map(
      explorerId => ({
        holiday_id: HOLIDAY.id,
        explorer_profile_id: explorerId,
        subject_profile_id:
          form.elements[explorerId].value
      })
    );

    const { data, error } = await supabaseClient
      .from("secret_assignments")
      .upsert(rows, {
        onConflict:
          "holiday_id,explorer_profile_id"
      })
      .select();

    if (error) throw error;

    SECRET_ASSIGNMENTS = Object.fromEntries(
      data.map(row => [
        row.explorer_profile_id,
        row
      ])
    );

    result.textContent =
      "Secret assignments saved ✓";

    result.classList.remove("hidden");
  } catch (error) {
    console.error(
      "Could not save secret assignments",
      error
    );

    result.textContent =
      `Could not save: ${error.message}`;

    result.classList.remove("hidden");
  } finally {
    button.disabled = false;
    button.textContent =
      "Save secret assignments";
  }
}
function buildPinManager(){const form=document.getElementById("pin-manager-form");if(!form)return;form.replaceChildren();Object.entries(PROFILES).forEach(([id,p])=>{const c=document.createElement("label");c.className="mission-editor-card pin-manager-card";c.innerHTML=`<div class="mission-editor-heading"><span class="mission-editor-icon">${p.icon}</span><div><strong>${p.name}</strong><small>Leave blank to keep current PIN</small></div></div><input name="${id}" type="password" inputmode="numeric" minlength="4" maxlength="8" placeholder="New PIN">`;form.appendChild(c);});document.getElementById("save-pin-changes").onclick=saveExplorerPinChanges;document.getElementById("change-parent-pin").onclick=changeParentPin;}
async function saveExplorerPinChanges(){const form=document.getElementById("pin-manager-form"),button=document.getElementById("save-pin-changes"),result=document.getElementById("pin-save-result");button.disabled=true;button.textContent="Saving...";try{const changes=Object.keys(PROFILES).map(id=>({id,pin:form.elements[id].value.trim()})).filter(x=>x.pin);if(!changes.length)throw new Error("Enter at least one new PIN.");for(const c of changes){if(!/^\d{4,8}$/.test(c.pin))throw new Error(`${PROFILES[c.id].name}'s PIN must be 4 to 8 digits.`);const {data,error}=await supabaseClient.rpc("set_explorer_pin",{explorer_id:c.id,new_pin:c.pin,parent_token:state.parentToken});if(error)throw error;if(!data)throw new Error("Parent Mode authorisation expired.");}form.reset();result.textContent="Explorer PINs updated ✓";result.classList.remove("hidden");}catch(e){result.textContent=`Could not save: ${e.message}`;result.classList.remove("hidden");}finally{button.disabled=false;button.textContent="Save changed PINs";}}
async function changeParentPin(){const input=document.getElementById("new-parent-pin"),button=document.getElementById("change-parent-pin"),result=document.getElementById("parent-pin-result"),pin=input.value.trim();if(!/^\d{4,8}$/.test(pin)){result.textContent="Parent PIN must be 4 to 8 digits.";result.classList.remove("hidden");return;}button.disabled=true;button.textContent="Changing...";try{const {data,error}=await supabaseClient.rpc("set_parent_pin",{new_pin:pin,parent_token:state.parentToken});if(error)throw error;if(!data)throw new Error("Parent Mode authorisation expired.");input.value="";state.parentUnlocked=false;state.parentToken=null;result.textContent="Parent PIN changed ✓. Re-open Parent Mode next time.";result.classList.remove("hidden");}catch(e){result.textContent=`Could not change PIN: ${e.message}`;result.classList.remove("hidden");}finally{button.disabled=false;button.textContent="Change Parent PIN";}}

async function renderGallery() {
  const tpl = document
    .getElementById("gallery-template")
    .content.cloneNode(true);

  const tabs = tpl.querySelector("#gallery-tabs");

  DAYS.forEach((day, index) => {
    const button = document.createElement("button");
    button.className =
      `gallery-tab ${index === state.galleryDay ? "active" : ""}`;
    button.textContent = day.day;

    button.onclick = () => {
      state.galleryDay = index;
      renderGallery();
    };

    tabs.appendChild(button);
  });

  tpl.querySelector("#back-dashboard").onclick = renderDashboard;
  app.replaceChildren(tpl);
  await loadGallery();
}

async function loadGallery() {
  const grid = document.getElementById("gallery-grid");
  const empty = document.getElementById("gallery-empty");

  if (!hasSupabase) {
    empty.textContent = "The shared gallery needs Supabase.";
    empty.classList.remove("hidden");
    return;
  }

  const { data, error } = await supabaseClient
    .from("entries")
    .select("*")
    .eq("day_index", state.galleryDay)
    .eq("media_type", "photo")
    .order("created_at", { ascending: true });

  if (error || !data?.length) {
    empty.classList.remove("hidden");
    return;
  }

  data.forEach(entry => {
    const item = document.createElement("button");
    item.className = "gallery-item";

    item.innerHTML = `
      <img src="${entry.media_url}" alt="${entry.profile_name}'s ${entry.theme} photo">
      <div class="gallery-meta">
        <strong>${entry.profile_name}</strong>
        <span>${entry.theme}</span>
      </div>
    `;

    item.onclick = () => openPhoto(entry);
    grid.appendChild(item);
  });
}

function openPhoto(entry) {
  const dialog = document.getElementById("photo-dialog");
  document.getElementById("dialog-image").src = entry.media_url;
  document.getElementById("dialog-caption").textContent =
    `${entry.profile_name} · ${entry.theme}`;
  dialog.showModal();
}

document.getElementById("close-dialog").onclick = () =>
  document.getElementById("photo-dialog").close();

document.getElementById("photo-dialog").onclick = event => {
  if (event.target.id === "photo-dialog") {
    event.target.close();
  }
};

async function initialiseApp() {
  try {
    const data = await loadAppData(cfg);

    PROFILES = data.profiles;
    HOLIDAY = data.holiday;
    DAYS = HOLIDAY.days;
    const missionData = await loadMissionData();
    MISSION_OVERRIDES = missionData.missionOverrides;
    DAILY_OVERRIDES = missionData.dailyOverrides;
    SECRET_ASSIGNMENTS = missionData.assignments;
    SECRET_PHOTOS = missionData.secretPhotos;

    access = createAccessController({
      app,
      getProfiles: () => PROFILES,
      getHoliday: () => HOLIDAY,
      setTheme,
      onExplorerAuthenticated: async () => renderDashboard()
    });

    document.title = HOLIDAY.appTitle;

    state.profileId && PROFILES[state.profileId] ? renderDashboard() : access.renderPicker();
  } catch (error) {
    console.error(error);

    app.innerHTML = `
      <section class="screen picker-screen">
        <div class="brand-mark">⚠️</div>
        <p class="eyebrow">FAMILY ADVENTURE</p>
        <h2>Could not load the adventure</h2>
        <p>${error.message}</p>
      </section>
    `;
  }
}

initialiseApp();
