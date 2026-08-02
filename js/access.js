import { setActiveExplorer } from "./state.js";
import { requireSupabase } from "./supabase-client.js";

export function createAccessController({
  app,
  getProfiles,
  getHoliday,
  setTheme,
  onExplorerAuthenticated
}) {
  function renderPicker() {
    const profiles = getProfiles();
    const holiday = getHoliday();

    document.documentElement.style.setProperty("--accent", "#244735");
    document.documentElement.style.setProperty("--accent-2", "#b57a45");

    const template = document
      .getElementById("profile-picker-template")
      .content.cloneNode(true);

    template.querySelector("#holiday-label").textContent =
      `${holiday.title.toUpperCase()} ${holiday.subtitle}`;

    template.querySelector("#app-title").innerHTML =
      holiday.appTitle.replace(" ", "<br />");

    const grid = template.querySelector("#profile-grid");

    Object.entries(profiles).forEach(([profileId, profile]) => {
      const button = document.createElement("button");
      button.className = "profile-card";
      button.style.background =
        `linear-gradient(145deg, ${profile.colours[0]}, ${profile.colours[1]})`;

      button.innerHTML = `
        <span class="profile-icon">${profile.icon}</span>
        <strong>${profile.name}</strong>
        <small>${profile.role}</small>
      `;

      button.onclick = () => renderPinScreen(profileId);
      grid.appendChild(button);
    });

    app.replaceChildren(template);
  }

  function renderPinScreen(profileId, parentOverride = false) {
    const profiles = getProfiles();
    const profile = profiles[profileId];

    if (!profile) {
      renderPicker();
      return;
    }

    setTheme(profile);

    const template = document
      .getElementById("pin-template")
      .content.cloneNode(true);

    const input = template.querySelector("#explorer-pin");
    const dots = [...template.querySelectorAll("#pin-dots span")];
    const submitButton = template.querySelector("#submit-pin");
    const errorMessage = template.querySelector("#pin-error");
    const copy = template.querySelector("#pin-copy");

    template.querySelector("#pin-profile-icon").textContent = profile.icon;
    template.querySelector("#pin-profile-name").textContent = profile.name;

    if (parentOverride) {
      copy.textContent =
        `Enter the Parent PIN to unlock ${profile.name}.`;
      submitButton.textContent = "Unlock with Parent PIN";
      input.maxLength = 8;
    }

    const updateDots = () => {
      dots.forEach((dot, index) => {
        dot.classList.toggle("filled", index < input.value.length);
      });
    };

    const addDigit = digit => {
      if (input.value.length >= Number(input.maxLength)) return;
      input.value += digit;
      updateDots();
    };

    template.querySelectorAll("[data-number]").forEach(button => {
      button.onclick = () => addDigit(button.dataset.number);
    });

    template.querySelector("#pin-clear").onclick = () => {
      input.value = "";
      updateDots();
    };

    template.querySelector("#pin-delete").onclick = () => {
      input.value = input.value.slice(0, -1);
      updateDots();
    };

    template.querySelector("#back-to-picker").onclick = renderPicker;

    template.querySelector("#parent-override").onclick = () => {
      renderPinScreen(profileId, !parentOverride);
    };

    const checkPin = async () => {
      errorMessage.classList.add("hidden");

      const pin = input.value.trim();

      if (pin.length < 4) {
        errorMessage.textContent = "Enter at least four digits.";
        errorMessage.classList.remove("hidden");
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Checking...";

      try {
        const client = requireSupabase();

        const functionName = parentOverride
          ? "verify_parent_pin"
          : "verify_explorer_pin";

        const args = parentOverride
          ? { entered_pin: pin }
          : {
              explorer_id: profileId,
              entered_pin: pin
            };

        const { data, error } = await client.rpc(
          functionName,
          args
        );

        if (error) throw error;
        if (data !== true) {
          throw new Error("That PIN is not correct.");
        }

        setActiveExplorer(profileId);
        await onExplorerAuthenticated(profileId);
      } catch (error) {
        console.error("Explorer check-in failed", error);

        errorMessage.textContent =
          error?.message || "Could not check the PIN.";

        errorMessage.classList.remove("hidden");
        input.value = "";
        updateDots();
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = parentOverride
          ? "Unlock with Parent PIN"
          : "Check in";
      }
    };

    submitButton.onclick = checkPin;

    input.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        checkPin();
      }
    });

    app.replaceChildren(template);
    input.focus();
  }

  return {
    renderPicker,
    renderPinScreen
  };
}
