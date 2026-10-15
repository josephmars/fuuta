"use strict";
// Fuuta: offline-first Pulaar trainer. State lives in localStorage; content comes from data.json.

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const KEY = "fuuta:v1";
const GAPS = [0, 1, 2, 4, 7, 14]; // days until next review per Leitner box
const NEW_PER_SESSION = 10, QUIZ_LEN = 8;
const dayNum = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);

const fresh = () => ({ xp: 0, streak: 0, lastDay: null, cards: {}, mode: "p2e" });
let S = (() => { try { return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return fresh(); } })();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private mode: progress just won't persist */ } };

function touch() {
  const d = dayNum();
  if (S.lastDay === d) return;
  S.streak = S.lastDay === d - 1 ? S.streak + 1 : 1;
  S.lastDay = d;
}
const streak = () => (S.lastDay != null && dayNum() - S.lastDay <= 1 ? S.streak : 0);

function grade(id, ok) {
  const c = S.cards[id] || { box: 0, due: 0 };
  c.box = ok ? Math.min(c.box + 1, 5) : 0;
  c.due = dayNum() + (ok ? GAPS[c.box] : 0);
  S.cards[id] = c;
  touch(); save();
}
const learned = id => (S.cards[id]?.box || 0) >= 2;

let DATA, ITEMS = [], UNIT_OF = {};
let session = null; // active study/quiz session, or null

const ICONS = {
  learn: '<rect x="4" y="6" width="13" height="14" rx="3"/><path d="M8 3h9a3 3 0 0 1 3 3v10"/>',
  path: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>',
  progress: '<path d="M5 20V11M12 20V5M19 20v-6"/>',
};
const TABS = [["learn", "Learn"], ["path", "Path"], ["quiz", "Quiz"], ["progress", "Progress"]];

function route() { return (location.hash.replace(/^#\/?/, "") || "learn").split("/"); }
const go = h => { location.hash = h; };

function render() {
  const [page, arg] = route();
  const tabs = $("#tabs");
  tabs.hidden = !!session;
  tabs.innerHTML = TABS.map(([k, l]) =>
    `<a href="#/${k}" class="${page === k || (k === "path" && page === "unit") ? "on" : ""}"><svg viewBox="0 0 24 24">${ICONS[k]}</svg>${l}</a>`).join("");
  const view = $("#view");
  if (session) view.innerHTML = session.kind === "quiz" ? quizView() : studyView();
  else view.innerHTML = ({ learn: learnView, path: pathView, quiz: quizSetup, progress: progressView, unit: () => unitView(arg) }[page] || learnView)();
  window.scrollTo(0, 0);
}

const header = (title, sub) => `<div class="top"><div><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ""}</div>
  <span class="chip">🔥 ${streak()}</span></div>`;
const badge = it => it.status === "needs-review" ? `<span class="badge">check spelling</span>` : "";

// ---------- Learn (flashcards) ----------
function buildQueue(unitId) {
  const pool = unitId ? ITEMS.filter(i => UNIT_OF[i.id].id === unitId) : ITEMS;
  const d = dayNum();
  const due = pool.filter(i => S.cards[i.id] && S.cards[i.id].due <= d)
    .sort((a, b) => S.cards[a.id].due - S.cards[b.id].due);
  const fresh_ = pool.filter(i => !S.cards[i.id]).slice(0, NEW_PER_SESSION);
  return [...due, ...fresh_].slice(0, 25);
}

function learnView() {
  const due = buildQueue(null);
  const nDue = due.filter(i => S.cards[i.id]).length, nNew = due.length - nDue;
  return `${header("Learn", "Flashcards")}
    <div class="card"><div class="lab">Today</div>
      <div class="big">${due.length ? due.length + " cards" : "All done"}</div>
      <div class="rule"></div>
      <div class="hint">${due.length ? `${nDue} to review · ${nNew} new` : "Come back tomorrow, or practise in Quiz."}</div></div>
    <div style="margin-top:22px">${due.length ? `<button class="btn" data-act="study" data-unit="">Start</button>` : ""}
    <a class="btn alt" href="#/quiz" style="text-decoration:none">Play a quiz</a></div>`;
}

function startStudy(unitId) {
  const q = buildQueue(unitId || null);
  if (!q.length) return;
  session = { kind: "study", queue: q.map(i => i.id), i: 0, flipped: false, again: {}, got: 0 };
  render();
}

function studyView() {
  const s = session;
  if (s.i >= s.queue.length) {
    return `<div class="empty"><div class="big">Session complete</div><p class="sub">${s.got} cards marked as known.</p>
      <button class="btn" data-act="end" style="margin-top:20px">Done</button></div>`;
  }
  const it = byId(s.queue[s.i]);
  const front = `<div class="big">${esc(it.pulaar)}</div>${badge(it)}<div class="hint">Tap to flip</div>`;
  const back = `<div class="lab">${esc(it.english)}</div>${it.french ? `<div class="hint">FR: ${esc(it.french)}</div>` : ""}`;
  return `<div class="sess-top"><button class="x" data-act="end" aria-label="Close">×</button>
      <div class="sub">${s.i + 1} / ${s.queue.length}</div></div>
    <div class="deck"><button class="card" data-act="flip">${s.flipped ? back : front}</button></div>
    <div class="acts">
      <button class="round no" data-act="again"><i>✕</i>To review</button>
      <button class="round yes" data-act="known"><i>✓</i>I know it</button></div>`;
}

// ---------- Path & phrasebook ----------
function unitStats(u) {
  const n = u.items.length, k = u.items.filter(i => learned(i.id)).length;
  return { n, k, pct: n ? Math.round(100 * k / n) : 0 };
}

function pathView() {
  const units = DATA.units.map((u, idx) => {
    const st = unitStats(u);
    return `<button class="unit ${st.pct === 100 ? "done" : ""}" data-go="unit/${u.id}">
      <div class="ico">${st.pct === 100 ? "★" : idx + 1}</div>
      <div style="flex:1"><b>${esc(u.title)}</b><span class="sub">${st.n} phrases · ${st.k} learned</span>
      <div class="bar"><i style="width:${st.pct}%"></i></div></div></button>`;
  }).join("");
  return `${header("Path", "Mauritanian Pulaar")}
    <input class="search" id="q" type="search" placeholder="Search phrasebook (Pulaar or English)" autocomplete="off">
    <div id="path-body">${units}</div>`;
}

function listItems(items) {
  return items.map(i => `<div class="item"><div class="l"><b>${esc(i.pulaar)}</b>${badge(i)}</div><span>${esc(i.english)}</span></div>`).join("")
    || `<p class="sub">Nothing found.</p>`;
}

function unitView(id) {
  const u = DATA.units.find(x => x.id === id);
  if (!u) return pathView();
  return `<a class="back" href="#/path">‹ Path</a>
    <h1>${esc(u.title)}</h1><p class="sub">${esc(u.description)}</p>
    <div class="row" style="margin:18px 0 6px">
      <button class="btn" data-act="study" data-unit="${u.id}">Study</button>
      <button class="btn alt" data-act="quiz-unit" data-unit="${u.id}" style="margin:0">Quiz</button></div>
    <h2>Phrasebook</h2>${listItems(u.items)}`;
}

// ---------- Quiz ----------
function quizSetup() {
  const opts = DATA.units.map(u => `<option value="${u.id}">${esc(u.title)}</option>`).join("");
  return `${header("Quiz", `${QUIZ_LEN} questions`)}
    <div class="seg" id="mode">
      <button data-mode="p2e" class="${S.mode === "p2e" ? "on" : ""}">Pulaar → English</button>
      <button data-mode="e2p" class="${S.mode === "e2p" ? "on" : ""}">English → Pulaar</button></div>
    <select class="search" id="scope"><option value="">All units</option>${opts}</select>
    <button class="btn" data-act="quiz-start">Start</button>`;
}

function startQuiz(unitId) {
  const pool = unitId ? ITEMS.filter(i => UNIT_OF[i.id].id === unitId) : ITEMS;
  const picks = shuffle(pool).slice(0, QUIZ_LEN);
  const qs = picks.map(it => {
    const ans = S.mode === "p2e" ? "english" : "pulaar";
    const same = ITEMS.filter(o => o.id !== it.id && o[ans] !== it[ans]);
    const near = shuffle(same.filter(o => o.kind === it.kind && UNIT_OF[o.id] === UNIT_OF[it.id]));
    const far = shuffle(same);
    const wrong = [...new Map([...near, ...far].map(o => [o[ans], o])).values()].slice(0, 3);
    return { it, options: shuffle([it, ...wrong]).map(o => o[ans]), answer: it[ans], picked: null };
  });
  session = { kind: "quiz", qs, i: 0, correct: 0, combo: 0, xp: 0, mode: S.mode };
  render();
}

function quizView() {
  const s = session;
  if (s.i >= s.qs.length) {
    return `<div class="empty"><div class="score">${s.correct}/${s.qs.length}</div>
      <div class="big">${s.correct === s.qs.length ? "Perfect!" : s.correct >= s.qs.length / 2 ? "Nice work" : "Keep practising"}</div>
      <p class="sub">+${s.xp} XP</p><button class="btn" data-act="end" style="margin-top:20px">Done</button></div>`;
  }
  const q = s.qs[s.i], p2e = s.mode === "p2e";
  const dashes = s.qs.map((x, k) => `<i class="${x.picked == null ? "" : x.picked === x.answer ? "c" : "d"}"></i>`).join("");
  const opts = q.options.map((o, k) => {
    const cls = q.picked == null ? "" : o === q.answer ? "ok" : o === q.picked ? "bad" : "";
    return `<button class="opt ${cls}" data-opt="${k}" ${q.picked != null ? "disabled" : ""}>${esc(o)}</button>`;
  }).join("");
  const right = q.picked === q.answer;
  const sheet = q.picked == null ? "" : `<div class="sheet ${right ? "ok" : "bad"}"><div>
      <b>${right ? "Exactly!" : "Not quite"}</b>
      <p>${right ? `+${s.lastXp} XP${s.combo > 1 ? ` · combo ×${s.combo}` : ""}` : `Answer: ${esc(q.answer)}`}</p>
      <button class="btn" data-act="next">Continue</button></div></div>`;
  return `<div class="sess-top"><button class="x" data-act="end" aria-label="Close">×</button><div class="dashes">${dashes}</div></div>
    <div class="q-lab">${p2e ? "What does this mean…" : "How do you say…"}</div>
    <div class="q-word">${p2e ? `<span>${esc(q.it.pulaar)}</span>` : `« <span>${esc(q.it.english)}</span> »`}</div>
    ${opts}${sheet}`;
}

function answer(k) {
  const s = session, q = s.qs[s.i];
  if (q.picked != null) return;
  q.picked = q.options[k];
  const ok = q.picked === q.answer;
  if (ok) { s.correct++; s.combo++; s.lastXp = 10 + Math.min(s.combo - 1, 5) * 2; s.xp += s.lastXp; S.xp += s.lastXp; }
  else s.combo = 0;
  grade(q.it.id, ok);
  render();
}

// ---------- Progress ----------
function progressView() {
  const total = ITEMS.length, k = ITEMS.filter(i => learned(i.id)).length;
  const rows = DATA.units.map(u => { const st = unitStats(u);
    return `<div style="margin-bottom:14px"><div class="top" style="margin:0"><b>${esc(u.title)}</b><span class="sub">${st.k}/${st.n}</span></div>
      <div class="bar"><i style="width:${st.pct}%"></i></div></div>`; }).join("");
  const review = ITEMS.filter(i => i.status === "needs-review").length;
  return `${header("Progress")}
    <div class="stat"><div><b>${S.xp}</b><small>XP</small></div><div><b>${k}</b><small>learned</small></div><div><b>${streak()}</b><small>day streak</small></div></div>
    <h2>By unit</h2>${rows}
    <h2>About this content</h2>
    <p class="sub">${total} phrases from a Mauritania-specific Pulaar course. ${review} are marked “check spelling” until a native speaker confirms them.</p>
    <button class="link" data-act="reset">Reset progress</button>`;
}

// ---------- events ----------
const byId = id => ITEMS.find(i => i.id === id);

document.addEventListener("click", e => {
  const t = e.target.closest("[data-act],[data-go],[data-mode],[data-opt]");
  if (!t) return;
  if (t.dataset.go) return go(t.dataset.go);
  if (t.dataset.mode) { S.mode = t.dataset.mode; save(); return render(); }
  if (t.dataset.opt != null) return answer(+t.dataset.opt);
  const s = session;
  switch (t.dataset.act) {
    case "study": return startStudy(t.dataset.unit);
    case "flip": s.flipped = !s.flipped; return render();
    case "known": case "again": {
      const id = s.queue[s.i], ok = t.dataset.act === "known";
      if (!ok && (s.again[id] = (s.again[id] || 0) + 1) <= 2) s.queue.push(id);
      grade(id, ok); if (ok) { s.got++; S.xp += 2; save(); }
      s.i++; s.flipped = false; return render();
    }
    case "quiz-start": return startQuiz($("#scope").value);
    case "quiz-unit": return startQuiz(t.dataset.unit);
    case "next": s.i++; return render();
    case "end": session = null; return render();
    case "reset":
      if (t.dataset.sure) { S = fresh(); save(); return render(); }
      t.dataset.sure = "1"; t.textContent = "Tap again to erase all progress"; return;
  }
});

document.addEventListener("input", e => {
  if (e.target.id !== "q") return;
  const q = e.target.value.trim().toLowerCase();
  $("#path-body").innerHTML = q
    ? listItems(ITEMS.filter(i => i.pulaar.toLowerCase().includes(q) || i.english.toLowerCase().includes(q)).slice(0, 60))
    : pathBodyUnits();
});
function pathBodyUnits() { const d = document.createElement("div"); d.innerHTML = pathView(); return $("#path-body", d).innerHTML; }

window.addEventListener("hashchange", () => { session = null; render(); });

(async function init() {
  try {
    DATA = await (await fetch("data.json")).json();
  } catch {
    $("#view").innerHTML = `<div class="empty"><div class="big">Couldn't load lessons</div><p class="sub">Run <code>uv run tools/build.py</code> and reload.</p></div>`;
    return;
  }
  for (const u of DATA.units) for (const i of u.items) { ITEMS.push(i); UNIT_OF[i.id] = u; }
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
  render();
})();
