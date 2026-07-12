const STORAGE_KEY = "petPlannerPetsV2";
const ACTIVE_KEY = "petPlannerActivePetV2";

const speciesEmoji = {
  Turtle: "🐢", Fish: "🐠", Dog: "🐶", Cat: "🐱", Bird: "🦜",
  Snake: "🐍", Lizard: "🦎", Rabbit: "🐇", "Small animal": "🐹",
  Horse: "🐴", Other: "🐾"
};

const colours = [
  { name: "Original Purple", hex: "#7c3aed", rgb: "124, 58, 237" },
  { name: "Heliotrope", hex: "#DF73FF", rgb: "223, 115, 255" },
  { name: "Pink", hex: "#ff5ca8", rgb: "255, 92, 168" },
  { name: "Red", hex: "#ef4444", rgb: "239, 68, 68" },
  { name: "Orange", hex: "#f97316", rgb: "249, 115, 22" },
  { name: "Yellow", hex: "#eab308", rgb: "234, 179, 8" },
  { name: "Green", hex: "#22c55e", rgb: "34, 197, 94" },
  { name: "Cyan", hex: "#06b6d4", rgb: "6, 182, 212" },
  { name: "Blue", hex: "#3b82f6", rgb: "59, 130, 246" },
  { name: "Grey", hex: "#71717a", rgb: "113, 113, 122" },
  { name: "Black", hex: "#242028", rgb: "36, 32, 40" },
  { name: "Brown", hex: "#8b5e3c", rgb: "139, 94, 60" }
];

let editingPetId = null;
let pendingPhoto = "";
let selectedColour = colours[0];

const $ = selector => document.querySelector(selector);
const petList = $("#petList");
const petsGrid = $("#petsGrid");
const emptyState = $("#emptyState");
const dashboard = $("#dashboard");
const petDialog = $("#petDialog");
const petForm = $("#petForm");
const featureMessage = $("#featureMessage");

function getPets() {
  try {
    const newPets = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(newPets)) return newPets;

    const oldPets = JSON.parse(localStorage.getItem("petPlannerPetsV1"));
    if (Array.isArray(oldPets)) {
      const migrated = oldPets.map(pet => ({
        ...pet,
        photo: "",
        colour: colours[0],
        feedHistory: []
      }));
      savePets(migrated);
      return migrated;
    }
    return [];
  } catch {
    return [];
  }
}

function savePets(pets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pets));
}

function getActiveId() {
  return localStorage.getItem(ACTIVE_KEY) || localStorage.getItem("petPlannerActivePetV1");
}

function setActiveId(id) {
  localStorage.setItem(ACTIVE_KEY, id);
}

function calculateAge(birthday) {
  if (!birthday) return "";
  const birth = new Date(`${birthday}T00:00:00`);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();

  if (now.getDate() < birth.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }

  if (years > 0) return `${years} year${years === 1 ? "" : "s"} old`;
  return `${Math.max(months, 0)} month${months === 1 ? "" : "s"} old`;
}

function formatDate(dateString) {
  if (!dateString) return "Not logged yet";
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(dateString));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function petImageMarkup(pet, className = "") {
  if (pet.photo) return `<img src="${pet.photo}" alt="${escapeHtml(pet.name)}" class="${className}">`;
  return speciesEmoji[pet.species] ?? "🐾";
}

function applyTheme(pet) {
  const colour = pet?.colour?.hex ? pet.colour : colours[0];
  document.documentElement.style.setProperty("--accent", colour.hex);
  document.documentElement.style.setProperty("--accent-rgb", colour.rgb);
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", colour.hex);
}

function render() {
  const pets = getPets();

  if (!pets.length) {
    petList.innerHTML = "";
    petsGrid.innerHTML = "";
    emptyState.hidden = false;
    dashboard.hidden = true;
    applyTheme(null);
    return;
  }

  emptyState.hidden = true;
  dashboard.hidden = false;

  let activeId = getActiveId();
  let activePet = pets.find(pet => pet.id === activeId);

  if (!activePet) {
    activePet = pets[0];
    setActiveId(activePet.id);
  }

  applyTheme(activePet);

  petList.innerHTML = pets.map(pet => `
    <button class="pet-chip ${pet.id === activePet.id ? "active" : ""}" data-id="${pet.id}">
      <div class="pet-thumb">${petImageMarkup(pet)}</div>
      <strong>${escapeHtml(pet.name)}</strong>
      <small>${escapeHtml(pet.species)}</small>
    </button>
  `).join("");

  petList.querySelectorAll(".pet-chip").forEach(button => {
    button.addEventListener("click", () => {
      setActiveId(button.dataset.id);
      featureMessage.textContent = "";
      render();
    });
  });

  petsGrid.innerHTML = pets.map(pet => `
    <button class="pet-grid-card" data-id="${pet.id}">
      <div class="pet-grid-photo">${petImageMarkup(pet)}</div>
      <strong>${escapeHtml(pet.name)}</strong>
      <small>${escapeHtml(pet.species)}</small>
    </button>
  `).join("");

  petsGrid.querySelectorAll(".pet-grid-card").forEach(button => {
    button.addEventListener("click", () => {
      setActiveId(button.dataset.id);
      switchView("homeView");
      render();
    });
  });

  $("#petAvatar").innerHTML = petImageMarkup(activePet);
  $("#petSpecies").textContent = activePet.species.toUpperCase();
  $("#petName").textContent = activePet.name;

  const metaParts = [activePet.breed, calculateAge(activePet.birthday)].filter(Boolean);
  $("#petMeta").textContent = metaParts.length ? metaParts.join(" • ") : "Profile ready";
  $("#petSex").textContent = activePet.sex || "Unknown";
  $("#petWeight").textContent = activePet.weight || "Not added";

  const feedHistory = activePet.feedHistory ?? [];
  const latestFeed = feedHistory.at(-1);
  $("#lastFedText").textContent = formatDate(latestFeed);
  $("#feedingPreview").textContent = feedHistory.length
    ? `${feedHistory.length} meal${feedHistory.length === 1 ? "" : "s"} logged`
    : "No meals logged";
}

function renderColourChoices() {
  $("#colourChoices").innerHTML = colours.map(colour => `
    <button
      type="button"
      class="colour-option ${colour.hex === selectedColour.hex ? "selected" : ""}"
      style="--swatch:${colour.hex}"
      data-hex="${colour.hex}"
      aria-label="${colour.name}"
      title="${colour.name}">
    </button>
  `).join("");

  document.querySelectorAll(".colour-option").forEach(button => {
    button.addEventListener("click", () => {
      selectedColour = colours.find(colour => colour.hex === button.dataset.hex) ?? colours[0];
      renderColourChoices();
      document.documentElement.style.setProperty("--accent", selectedColour.hex);
      document.documentElement.style.setProperty("--accent-rgb", selectedColour.rgb);
    });
  });
}

function openDialog(pet = null) {
  petForm.reset();
  editingPetId = pet?.id ?? null;
  pendingPhoto = pet?.photo ?? "";
  selectedColour = pet?.colour?.hex ? pet.colour : colours[0];

  $("#dialogEyebrow").textContent = pet ? "EDIT PROFILE" : "NEW PROFILE";
  $("#dialogTitle").textContent = pet ? `Edit ${pet.name}` : "Add a pet";
  $("#deletePet").hidden = !pet;

  $("#nameInput").value = pet?.name ?? "";
  $("#speciesInput").value = pet?.species ?? "";
  $("#breedInput").value = pet?.breed ?? "";
  $("#birthdayInput").value = pet?.birthday ?? "";
  $("#sexInput").value = pet?.sex ?? "";
  $("#weightInput").value = pet?.weight ?? "";

  updatePhotoPreview(pet);
  renderColourChoices();
  petDialog.showModal();
}

function updatePhotoPreview(pet = null) {
  if (pendingPhoto) {
    $("#photoPreview").innerHTML = `<img src="${pendingPhoto}" alt="Pet preview">`;
  } else {
    const species = $("#speciesInput").value || pet?.species;
    $("#photoPreview").textContent = speciesEmoji[species] ?? "🐾";
  }
}

function resizeImage(file, maxSize = 700, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const context = canvas.getContext("2d");
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handlePhotoChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    pendingPhoto = await resizeImage(file);
    updatePhotoPreview();
  } catch {
    alert("That photo couldn't be loaded.");
  }
}

function switchView(viewId) {
  document.querySelectorAll(".view").forEach(view => {
    view.classList.toggle("active-view", view.id === viewId);
  });

  document.querySelectorAll(".nav-button").forEach(button => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("#openAddPet").addEventListener("click", () => openDialog());
$("#emptyAddPet").addEventListener("click", () => openDialog());
$("#petsAddButton").addEventListener("click", () => openDialog());
$("#closeDialog").addEventListener("click", () => {
  petDialog.close();
  render();
});

$("#speciesInput").addEventListener("change", () => {
  if (!pendingPhoto) updatePhotoPreview();
});

$("#photoInput").addEventListener("change", handlePhotoChange);

$("#editPet").addEventListener("click", () => {
  const activePet = getPets().find(pet => pet.id === getActiveId());
  if (activePet) openDialog(activePet);
});

$("#quickFeedButton").addEventListener("click", () => {
  const pets = getPets();
  const pet = pets.find(item => item.id === getActiveId());
  if (!pet) return;

  pet.feedHistory = pet.feedHistory ?? [];
  pet.feedHistory.push(new Date().toISOString());
  savePets(pets);
  render();

  $("#quickFeedButton").textContent = "Fed! 🐾";
  setTimeout(() => $("#quickFeedButton").textContent = "Feed now", 1100);
});

petForm.addEventListener("submit", event => {
  event.preventDefault();

  const petData = {
    name: $("#nameInput").value.trim(),
    species: $("#speciesInput").value,
    breed: $("#breedInput").value.trim(),
    birthday: $("#birthdayInput").value,
    sex: $("#sexInput").value,
    weight: $("#weightInput").value.trim(),
    photo: pendingPhoto,
    colour: selectedColour
  };

  if (!petData.name || !petData.species) return;

  const pets = getPets();

  if (editingPetId) {
    const index = pets.findIndex(pet => pet.id === editingPetId);
    if (index >= 0) {
      pets[index] = {
        ...pets[index],
        ...petData,
        feedHistory: pets[index].feedHistory ?? []
      };
    }
    setActiveId(editingPetId);
  } else {
    const newPet = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      ...petData,
      feedHistory: []
    };
    pets.push(newPet);
    setActiveId(newPet.id);
  }

  savePets(pets);
  petDialog.close();
  render();
});

$("#deletePet").addEventListener("click", () => {
  if (!editingPetId) return;

  const pets = getPets();
  const pet = pets.find(item => item.id === editingPetId);
  if (!pet) return;

  if (!confirm(`Delete ${pet.name}'s profile?`)) return;

  const remaining = pets.filter(item => item.id !== editingPetId);
  savePets(remaining);

  if (remaining.length) setActiveId(remaining[0].id);
  else localStorage.removeItem(ACTIVE_KEY);

  petDialog.close();
  render();
});

document.querySelectorAll(".feature-card").forEach(button => {
  button.addEventListener("click", () => {
    const feature = button.dataset.feature;
    if (feature === "builder") {
      switchView("builderView");
      return;
    }
    const label = button.querySelector("span:not(.feature-emoji)")?.textContent ?? "This feature";
    featureMessage.textContent = `${label} is ready for us to build next 👀`;
  });
});

document.querySelectorAll(".nav-button").forEach(button => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

render();
