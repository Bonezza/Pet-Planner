const lastFedElement = document.querySelector("#lastFed");
const feedButton = document.querySelector("#feedButton");
const undoButton = document.querySelector("#undoButton");
const mealCountElement = document.querySelector("#mealCount");
const todayDateElement = document.querySelector("#todayDate");

const STORAGE_KEY = "squirtleFeedHistory";

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function render() {
  const history = getHistory();
  const latest = history.at(-1);

  lastFedElement.textContent = latest ? formatDate(latest) : "Not logged yet";
  mealCountElement.textContent = String(history.length);
  undoButton.hidden = history.length === 0;
}

feedButton.addEventListener("click", () => {
  const history = getHistory();
  history.push(new Date().toISOString());
  saveHistory(history);
  render();

  feedButton.textContent = "Fed! 🐢";
  setTimeout(() => {
    feedButton.textContent = "Feed Squirtle";
  }, 1200);
});

undoButton.addEventListener("click", () => {
  const history = getHistory();
  history.pop();
  saveHistory(history);
  render();
});

todayDateElement.textContent = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "full"
}).format(new Date());

render();
