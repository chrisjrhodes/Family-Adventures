const PROFILES = {
  jacob: {
    name: "Jacob",
    role: "Pathfinder",
    colours: ["#315b3f", "#765238"],
    secret: "Capture a genuine photo of Dad laughing."
  },
  caitlin: {
    name: "Caitlin",
    role: "Discoverer",
    colours: ["#7452a5", "#1f9aa0"],
    secret: "Capture a brilliant photo of Jacob and Caitlin together."
  },
  esmae: {
    name: "Esmae",
    role: "Trailblazer",
    colours: ["#d94f9b", "#7b4fa3"],
    secret: "Capture a brilliant photo of Esmae and Jacob together."
  },
  jess: {
    name: "Jess",
    role: "Memory Keeper",
    colours: ["#245743", "#6d8b78"],
    secret: "Capture a brilliant photo of Jess and Caitlin together."
  },
  chris: {
    name: "Chris",
    role: "Chief Explorer",
    colours: ["#244735", "#b57a45"],
    secret: "Capture a photo of Dad and Grandad together."
  },
  grandad: {
    name: "Grandad",
    role: "Senior Explorer",
    colours: ["#42566f", "#8a6a42"],
    secret: "Capture the whole family together without making it feel staged."
  }
};

const DAYS = [
  { day: "Day 1", theme: "Blue", photo: "Find the strongest photo featuring something blue.", video: "What was the first thing you noticed when we arrived?" },
  { day: "Day 2", theme: "Nature", photo: "Capture nature in a way nobody else will think of.", video: "What was your favourite thing today?" },
  { day: "Day 3", theme: "Triangles", photo: "Find a triangle hiding somewhere in the day.", video: "What made you laugh most today?" },
  { day: "Day 4", theme: "Reflections", photo: "Use water, glass, mirrors or shadows to create a reflection.", video: "What surprised you today?" },
  { day: "Day 5", theme: "Movement", photo: "Capture something or someone in motion.", video: "What would you do again from today?" },
  { day: "Day 6", theme: "Patterns", photo: "Find a pattern other people might walk straight past.", video: "What is one thing you do not want to forget?" },
  { day: "Day 7", theme: "The Holiday in One Photo", photo: "Take one photo that sums up the whole holiday for you.", video: "Describe the holiday in one sentence." }
];

const app = document.getElementById("app");
const cfg = window.APP_CONFIG || {};
const hasSupabase = cfg.supabaseUrl && !cfg.supabaseUrl.includes("YOUR_");
const supabaseClient = hasSupabase
  ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
  : null;

let state = {
  profileId: localStorage.getItem("family-adventure-profile"),
  dayIndex: Number(localStorage.getItem("family-adventure-day") || 0),
  photoFile: null,
  videoFile: null,
  galleryDay: 0
};

function setTheme(profile) {
  document.documentElement.style.setProperty("--accent", profile.colours[0]);
  document.documentElement.style.setProperty("--accent-2", profile.colours[1]);
}

function renderPicker() {
  const tpl = document.getElementById("profile-picker-template").content.cloneNode(true);
  const grid = tpl.querySelector("#profile-grid");

  Object.entries(PROFILES).forEach(([id, p]) => {
    const button = document.createElement("button");
    button.className = "profile-card";
    button.style.background = `linear-gradient(135deg, ${p.colours[0]}, ${p.colours[1]})`;
    button.innerHTML = `<strong>${p.name}</strong><span>${p.role}</span>`;
    button.onclick = () => {
      state.profileId = id;
      localStorage.setItem("family-adventure-profile", id);
      renderDashboard();
    };
    grid.appendChild(button);
  });

  app.replaceChildren(tpl);
}

function renderDashboard() {
  const profile = PROFILES[state.profileId];
  if (!profile) return renderPicker();
  setTheme(profile);

  const tpl = document.getElementById("dashboard-template").content.cloneNode(true);
  const day = DAYS[state.dayIndex];

  tpl.querySelector("#welcome-title").textContent = `Welcome, ${profile.name}`;
  tpl.querySelector("#avatar").textContent = profile.name[0];
  tpl.querySelector("#avatar").style.background = profile.colours[0];
  tpl.querySelector("#day-label").textContent = day.day;
  tpl.querySelector("#day-theme").textContent = day.theme;
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
  tpl.querySelector("#open-gallery").onclick = () => renderGallery();

  const photoInput = tpl.querySelector("#photo-input");
  const videoInput = tpl.querySelector("#video-input");
  const photoPreview = tpl.querySelector("#photo-preview");
  const videoPreview = tpl.querySelector("#video-preview");
  const savePhoto = tpl.querySelector("#save-photo");
  const saveVideo = tpl.querySelector("#save-video");

  photoInput.onchange = () => {
    state.photoFile = photoInput.files[0];
    if (!state.photoFile) return;
    photoPreview.innerHTML = `<img alt="Selected photo" src="${URL.createObjectURL(state.photoFile)}">`;
    photoPreview.classList.remove("hidden");
    savePhoto.classList.remove("hidden");
  };

  videoInput.onchange = () => {
    state.videoFile = videoInput.files[0];
    if (!state.videoFile) return;
    videoPreview.innerHTML = `<video controls src="${URL.createObjectURL(state.videoFile)}"></video>`;
    videoPreview.classList.remove("hidden");
    saveVideo.classList.remove("hidden");
  };

  savePhoto.onclick = async () => saveMedia("photo", state.photoFile, savePhoto);
  saveVideo.onclick = async () => saveMedia("video", state.videoFile, saveVideo);

  app.replaceChildren(tpl);
  refreshStatus();
}

function changeDay(delta) {
  state.dayIndex = (state.dayIndex + delta + DAYS.length) % DAYS.length;
  localStorage.setItem("family-adventure-day", state.dayIndex);
  renderDashboard();
}

function statusKey(type) {
  return `family-adventure-${state.profileId}-${state.dayIndex}-${type}`;
}

async function refreshStatus() {
  const photoStatus = document.getElementById("photo-status");
  const videoStatus = document.getElementById("video-status");
  if (!photoStatus || !videoStatus) return;

  if (!hasSupabase) {
    photoStatus.textContent = localStorage.getItem(statusKey("photo")) ? "Photo saved locally" : "Photo not saved";
    videoStatus.textContent = localStorage.getItem(statusKey("video")) ? "Video saved locally" : "Video not saved";
    return;
  }

  const { data, error } = await supabaseClient
    .from("entries")
    .select("media_type")
    .eq("profile_id", state.profileId)
    .eq("day_index", state.dayIndex);

  if (error) return;
  const types = new Set(data.map(x => x.media_type));
  photoStatus.textContent = types.has("photo") ? "Photo saved ✓" : "Photo not saved";
  videoStatus.textContent = types.has("video") ? "Video saved ✓" : "Video not saved";
}

async function saveMedia(type, file, button) {
  if (!file) return;
  button.disabled = true;
  button.textContent = "Saving...";

  try {
    if (!hasSupabase) {
      localStorage.setItem(statusKey(type), "1");
      alert("Saved in demo mode on this device. Add Supabase details in config.js for shared uploads.");
      renderDashboard();
      return;
    }

    const ext = file.name.split(".").pop() || (type === "photo" ? "jpg" : "mp4");
    const path = `${state.profileId}/day-${state.dayIndex + 1}/${type}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("adventure-media")
      .upload(path, file, { upsert: false, contentType: file.type });

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
        media_type: type,
        media_url: publicData.publicUrl,
        theme: DAYS[state.dayIndex].theme
      });

    if (dbError) throw dbError;
    renderDashboard();
  } catch (err) {
    console.error(err);
    alert(`Could not save: ${err.message}`);
    button.disabled = false;
    button.textContent = `Save ${type}`;
  }
}

async function renderGallery() {
  const tpl = document.getElementById("gallery-template").content.cloneNode(true);
  const tabs = tpl.querySelector("#gallery-tabs");

  DAYS.forEach((d, i) => {
    const btn = document.createElement("button");
    btn.className = `gallery-tab ${i === state.galleryDay ? "active" : ""}`;
    btn.textContent = d.day;
    btn.onclick = () => {
      state.galleryDay = i;
      renderGallery();
    };
    tabs.appendChild(btn);
  });

  tpl.querySelector("#back-dashboard").onclick = renderDashboard;
  app.replaceChildren(tpl);
  await loadGallery();
}

async function loadGallery() {
  const grid = document.getElementById("gallery-grid");
  const empty = document.getElementById("gallery-empty");

  if (!hasSupabase) {
    empty.textContent = "Gallery needs Supabase to share uploads between devices.";
    empty.classList.remove("hidden");
    return;
  }

  const { data, error } = await supabaseClient
    .from("entries")
    .select("*")
    .eq("day_index", state.galleryDay)
    .order("created_at", { ascending: true });

  if (error || !data?.length) {
    empty.classList.remove("hidden");
    return;
  }

  data.forEach(entry => {
    const item = document.createElement("article");
    item.className = "gallery-item";
    item.innerHTML = entry.media_type === "photo"
      ? `<img src="${entry.media_url}" alt="${entry.profile_name}'s ${entry.theme} photo">`
      : `<video controls src="${entry.media_url}"></video>`;
    item.innerHTML += `<div class="gallery-meta"><strong>${entry.profile_name}</strong><br>${entry.theme} · ${entry.media_type}</div>`;
    grid.appendChild(item);
  });
}

state.profileId ? renderDashboard() : renderPicker();
