const KEY = "drill-deck-v1";

const sample = () => ({
  decks: [
    {
      id: "d1",
      name: "HTTP basics",
      cards: [
        { id: "c1", front: "What does HTTP 404 mean?", back: "The requested resource was not found.", due: 0, interval: 0 },
        { id: "c2", front: "Idempotent methods?", back: "GET, PUT, DELETE — repeating them has the same effect.", due: 0, interval: 0 },
        { id: "c3", front: "What is CORS?", back: "A browser rule that restricts cross-origin requests unless the server allows them.", due: 0, interval: 0 },
      ],
    },
    {
      id: "d2",
      name: "SQL",
      cards: [
        { id: "c4", front: "INNER JOIN", back: "Returns rows with matching keys in both tables.", due: 0, interval: 0 },
        { id: "c5", front: "WHERE vs HAVING", back: "WHERE filters rows; HAVING filters groups after aggregation.", due: 0, interval: 0 },
      ],
    },
  ],
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : sample();
  } catch {
    return sample();
  }
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}
function uid() {
  return Math.random().toString(36).slice(2, 9);
}
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br>");
}
function now() {
  return Date.now();
}

let state = load();
let currentDeck = null;
let queue = [];
let qIndex = 0;
let showingBack = false;
let editingCard = null;

const home = document.getElementById("home");
const editor = document.getElementById("editor");
const study = document.getElementById("study");

function dueCount(deck) {
  return deck.cards.filter((c) => c.due <= now()).length;
}

function show(el) {
  home.hidden = editor.hidden = study.hidden = true;
  el.hidden = false;
}

function renderHome() {
  document.getElementById("decks").innerHTML = state.decks
    .map((d) => `<button type="button" class="deck" data-open="${d.id}">
        <h3>${escapeHtml(d.name)}</h3>
        <div class="meta">${d.cards.length} cards · ${dueCount(d)} due</div>
      </button>`)
    .join("");
}

function renderEditor() {
  const d = state.decks.find((x) => x.id === currentDeck);
  if (!d) return show(home);
  document.getElementById("editorTitle").textContent = d.name;
  document.getElementById("cards").innerHTML =
    d.cards
      .map(
        (c) => `<div class="card">
        <strong>${escapeHtml(c.front)}</strong>
        <div class="meta">${escapeHtml(c.back)}</div>
        <div style="margin-top:0.4rem">
          <button type="button" class="tiny" data-edit="${c.id}">Edit</button>
          <button type="button" class="tiny" data-del="${c.id}">Delete</button>
        </div>
      </div>`
      )
      .join("") || `<p class="hint">No cards yet.</p>`;
}

function renderStudy() {
  const card = queue[qIndex];
  const empty = document.getElementById("emptyStudy");
  const flip = document.getElementById("flipCard");
  const grade = document.getElementById("grade");
  if (!card) {
    flip.hidden = true;
    grade.hidden = true;
    empty.hidden = false;
    document.getElementById("studyProg").textContent = "";
    return;
  }
  empty.hidden = true;
  flip.hidden = false;
  grade.hidden = !showingBack;
  document.getElementById("studyProg").textContent = `Card ${qIndex + 1} of ${queue.length}`;
  flip.innerHTML = showingBack
    ? `<span class="meta">Back</span><div>${escapeHtml(card.back)}</div>`
    : `<span class="meta">Front · tap to flip</span><div>${escapeHtml(card.front)}</div>`;
}

document.getElementById("decks").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-open]");
  if (!btn) return;
  currentDeck = btn.dataset.open;
  show(editor);
  renderEditor();
});

document.getElementById("backHome").onclick = () => {
  show(home);
  renderHome();
};

document.getElementById("addDeck").onclick = () => {
  const name = prompt("Deck name");
  if (!name || !name.trim()) return;
  const id = uid();
  state.decks.push({ id, name: name.trim(), cards: [] });
  currentDeck = id;
  save();
  show(editor);
  renderEditor();
};

document.getElementById("addCard").onclick = () => {
  editingCard = null;
  document.getElementById("cardDialogTitle").textContent = "New card";
  document.getElementById("cardForm").reset();
  document.getElementById("cardDialog").showModal();
};

document.getElementById("cancelCard").onclick = () => document.getElementById("cardDialog").close();

document.getElementById("cardForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const d = state.decks.find((x) => x.id === currentDeck);
  const front = e.target.front.value.trim();
  const back = e.target.back.value.trim();
  if (editingCard) {
    const c = d.cards.find((x) => x.id === editingCard);
    c.front = front;
    c.back = back;
  } else {
    d.cards.push({ id: uid(), front, back, due: 0, interval: 0 });
  }
  save();
  document.getElementById("cardDialog").close();
  renderEditor();
});

document.getElementById("cards").addEventListener("click", (e) => {
  const d = state.decks.find((x) => x.id === currentDeck);
  const edit = e.target.closest("[data-edit]");
  const del = e.target.closest("[data-del]");
  if (edit) {
    const c = d.cards.find((x) => x.id === edit.dataset.edit);
    editingCard = c.id;
    document.getElementById("cardDialogTitle").textContent = "Edit card";
    const f = document.getElementById("cardForm");
    f.front.value = c.front;
    f.back.value = c.back;
    document.getElementById("cardDialog").showModal();
  }
  if (del) {
    d.cards = d.cards.filter((x) => x.id !== del.dataset.del);
    save();
    renderEditor();
  }
});

document.getElementById("studyBtn").onclick = () => {
  const d = state.decks.find((x) => x.id === currentDeck);
  queue = d.cards.filter((c) => c.due <= now());
  qIndex = 0;
  showingBack = false;
  show(study);
  renderStudy();
};

document.getElementById("exitStudy").onclick = () => {
  show(editor);
  renderEditor();
};

document.getElementById("flipCard").onclick = () => {
  if (!queue[qIndex]) return;
  showingBack = !showingBack;
  renderStudy();
};

document.getElementById("grade").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-grade]");
  if (!btn) return;
  const card = queue[qIndex];
  if (btn.dataset.grade === "again") {
    card.interval = 0;
    card.due = now() + 10 * 60 * 1000;
  } else {
    card.interval = card.interval ? card.interval * 2 : 1;
    card.due = now() + card.interval * 24 * 60 * 60 * 1000;
  }
  save();
  qIndex += 1;
  showingBack = false;
  renderStudy();
});

document.getElementById("resetBtn").onclick = () => {
  state = sample();
  currentDeck = null;
  save();
  show(home);
  renderHome();
};

show(home);
renderHome();
