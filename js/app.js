import { loadAppData } from "./data.js";

const app = document.getElementById("app");
const cfg = window.APP_CONFIG || {};

let PROFILES = {};
let HOLIDAY = null;
let DAYS = [];

const hasSupabase = Boolean(
  cfg.supabaseUrl &&
  cfg.supabaseAnonKey &&
  !cfg.supabaseUrl.includes("YOUR_")
);

const supabaseClient = hasSupabase
  ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
  : null;

<<<<<<< HEAD
let state = {
=======
const state = {
>>>>>>> e107d42 (refactor: establish clean data-driven architecture)
  profileId: localStorage.getItem("family-adventure-profile"),
  dayIndex: Number(localStorage.getItem("family-adventure-day") || 0),
  photoFile: null,
  galleryDay: 0
};

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

function renderPicker() {
  document.documentElement.style.setProperty("--accent", "#244735");
  document.documentElement.style.setProperty("--accent-2", "#b57a45");

  const tpl = document
    .getElementById("profile-picker-template")
    .content.cloneNode(true);

  tpl.querySelector("#holiday-label").textContent =
    `${HOLIDAY.title.toUpperCase()} ${HOLIDAY.subtitle}`;

  tpl.querySelector("#app-title").innerHTML =
<<<<<<< HEAD
    `${HOLIDAY.appTitle.replace(" ", "<br />")}`;
=======
    HOLIDAY.appTitle.replace(" ", "<br />");
>>>>>>> e107d42 (refactor: establish clean data-driven architecture)

  const grid = tpl.querySelector("#profile-grid");

  Object.entries(PROFILES).forEach(([id, profile]) => {
    const button = document.createElement("button");
    button.className = "profile-card";
    button.style.background =
      `linear-gradient(145deg, ${profile.colours[0]}, ${profile.colours[1]})`;

    button.innerHTML = `
      <span class="profile-icon">${profile.icon}</span>
      <strong>${profile.name}</strong>
      <small>${profile.role}</small>
    `;

    button.onclick = () => {
      state.profileId = id;
      localStorage.setItem("family-adventure-profile", id);
      renderDashboard();
    };

    grid.appendChild(button);
  });

  app.replaceChildren(tpl);
}

async function renderDashboard() {
  const profile = PROFILES[state.profileId];
  if (!profile) return renderPicker();

  setTheme(profile);

  const day = DAYS[state.dayIndex];
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
  tpl.querySelector("#secret-mission").textContent = profile.secret;

  tpl.querySelector("#switch-profile").onclick = () => {
    localStorage.removeItem("family-adventure-profile");
    state.profileId = null;
    renderPicker();
  };

  tpl.querySelector("#prev-day").onclick = () => changeDay(-1);
  tpl.querySelector("#next-day").onclick = () => changeDay(1);
  tpl.querySelector("#open-gallery").onclick = renderGallery;

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
  state.dayIndex = (state.dayIndex + delta + DAYS.length) % DAYS.length;
  localStorage.setItem("family-adventure-day", state.dayIndex);
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

<<<<<<< HEAD
  const photoDot = document.getElementById("photo-dot");
  const videoDot = document.getElementById("video-dot");
=======
  document.getElementById("photo-dot")
    ?.classList.toggle("complete", photoDone);

  document.getElementById("video-dot")
    ?.classList.toggle("complete", videoDone);

>>>>>>> e107d42 (refactor: establish clean data-driven architecture)
  const photoProgress = document.getElementById("photo-progress");
  const videoButton = document.getElementById("toggle-video");
  const dayComplete = document.getElementById("day-complete");

<<<<<<< HEAD
  photoDot?.classList.toggle("complete", photoDone);
  videoDot?.classList.toggle("complete", videoDone);

=======
>>>>>>> e107d42 (refactor: establish clean data-driven architecture)
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
        theme: DAYS[state.dayIndex].theme
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

    document.title = HOLIDAY.appTitle;

    state.profileId ? renderDashboard() : renderPicker();
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
