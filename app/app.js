"use strict";
// Fuuta: offline-first Pulaar trainer. State lives in localStorage; content comes from data.json.

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const KEY = "fuuta:v1";
const GAPS = [0, 1, 2, 4, 7, 14]; // days until next review per Leitner box
const NEW_PER_SESSION = 10, QUIZ_LEN = 8;
const dayNum = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / 864e5);

const fresh = () => ({ xp: 0, streak: 0, lastDay: null, cards: {}, notes: {}, mode: "p2e" });
let S = (() => { try { return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return fresh(); } })();
// Fold accented/special letters so travelers can search without typing ɓ ɗ ŋ ƴ ñ.
const fold = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/ɓ/g, "b").replace(/ɗ/g, "d").replace(/ŋ/g, "n").replace(/ƴ/g, "y");
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
  dictionary: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>',
  quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>',
  progress: '<path d="M5 20V11M12 20V5M19 20v-6"/>',
};
const TABS = [["learn", "Learn"], ["path", "Path"], ["dictionary", "Words"], ["quiz", "Quiz"], ["progress", "Progress"]];
const TAB_OF = { unit: "path", word: "dictionary", alphabet: "path", roleplays: "path", trip: "learn" }; // detail pages keep their parent tab lit

function route() { return (location.hash.replace(/^#\/?/, "") || "learn").split("/"); }
const go = h => { location.hash = h; };

function render() {
  const [page, arg] = route();
  const tabs = $("#tabs");
  tabs.hidden = !!session;
  tabs.innerHTML = TABS.map(([k, l]) =>
    `<a href="#/${k}" class="${(TAB_OF[page] || page) === k ? "on" : ""}"><svg viewBox="0 0 24 24">${ICONS[k]}</svg>${l}</a>`).join("");
  const view = $("#view");
  if (session) view.innerHTML = session.kind === "quiz" ? quizView() : session.kind === "roleplay" ? roleplayView() : studyView();
  else view.innerHTML = ({ learn: learnView, path: pathView, dictionary: dictView, quiz: quizSetup, progress: progressView,
    unit: () => unitView(arg), word: () => wordView(arg), alphabet: alphabetView, roleplays: roleplayList, trip: tripView }[page] || learnView)();
  window.scrollTo(0, 0);
}

const header = (title, sub) => `<div class="top"><div><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ""}</div>
  <span class="chip">🔥 ${streak()}</span></div>`;
const badge = it => it.status === "needs-review" ? `<span class="badge">check spelling</span>`
  : it.confirmed ? `<span class="badge ok">native-checked</span>` : "";

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
  return `<img class="logo" src="icons/logo.svg" alt="Fuuta, learn Mauritanian Pulaar" width="220" height="220">
    ${header("Learn", "Flashcards")}
    <div class="card"><div class="lab">Today</div>
      <div class="big">${due.length ? due.length + " cards" : "All done"}</div>
      <div class="rule"></div>
      <div class="hint">${due.length ? `${nDue} to review · ${nNew} new` : "Come back tomorrow, or practise in Quiz."}</div></div>
    <div style="margin-top:22px">${due.length ? `<button class="btn" data-act="study" data-unit="">Start</button>` : ""}
    <a class="btn alt" href="#/quiz" style="text-decoration:none">Play a quiz</a>
    <a class="btn alt" href="#/trip" style="text-decoration:none">Trip phrases</a></div>`;
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
  const back = `<div class="lab">${esc(it.english)}</div>${it.french ? `<div class="hint">FR: ${esc(it.french)}</div>` : ""}
    ${usageBlock(it)}${noteBox(it.id)}<div class="hint">Tap the card to flip back</div>`;
  return `<div class="sess-top"><button class="x" data-act="end" aria-label="Close">×</button>
      <div class="sub">${s.i + 1} / ${s.queue.length}</div></div>
    <div class="deck"><div class="card" role="button" tabindex="0" data-act="flip">${s.flipped ? back : front}</div></div>
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
  const extra = `<button class="unit" data-go="alphabet"><div class="ico alt">Aa</div><div style="flex:1"><b>Alphabet and sounds</b>
      <span class="sub">${DATA.alphabet.letters.length} letters, incl. ɓ ɗ ŋ ƴ</span></div></button>
    <button class="unit" data-go="roleplays"><div class="ico alt">💬</div><div style="flex:1"><b>Role-plays</b>
      <span class="sub">${DATA.dialogues.length} short conversations</span></div></button>`;
  return `${header("Path", "Mauritanian Pulaar")}${extra}<h2>Topics</h2>${units}`;
}

const usageBlock = it => it.usage ? `<div class="usage"><small>When to use</small>${esc(it.usage)}</div>` : "";
const noteBox = id => `<textarea class="note" data-note="${esc(id)}" rows="2" maxlength="2000"
  placeholder="Your notes (only on this device)">${esc(S.notes[id] || "")}</textarea>`;

function listItems(items) {
  return items.map(i => `<button class="item" data-go="word/${esc(i.id)}"><div class="l"><b>${esc(i.pulaar)}</b>${badge(i)}
    ${S.notes[i.id] ? `<span class="dot" title="Has your note">✎</span>` : ""}</div>
    <span>${esc(i.english)}</span><em class="${learned(i.id) ? "got" : ""}">${learned(i.id) ? "✓" : ""}</em></button>`).join("")
    || `<p class="sub">Nothing found.</p>`;
}

// ---------- Dictionary ----------
const DICT = { q: "", f: "all", topic: "" };
function dictItems() {
  const q = fold(DICT.q.trim());
  return ITEMS.filter(i => (!DICT.topic || UNIT_OF[i.id].id === DICT.topic)
    && (DICT.f === "all" || (DICT.f === "learned") === learned(i.id))
    && (!q || fold(i.pulaar).includes(q) || fold(i.english).includes(q)));
}
function dictBody() {
  const rows = dictItems();
  return `<p class="sub" style="margin:0 0 6px">${rows.length} of ${ITEMS.length} entries</p>${listItems(rows)}`;
}
function dictView() {
  const topics = DATA.units.map(u => `<option value="${u.id}" ${DICT.topic === u.id ? "selected" : ""}>${esc(u.title)}</option>`).join("");
  const seg = (f, l) => `<button data-dict-f="${f}" class="${DICT.f === f ? "on" : ""}">${l}</button>`;
  return `${header("Words", "Every word and phrase")}
    <input class="search" id="dq" type="search" value="${esc(DICT.q)}" placeholder="Search Pulaar or English" autocomplete="off" autocapitalize="off">
    <div class="seg">${seg("all", "All")}${seg("learned", "Learned")}${seg("new", "Not learned")}</div>
    <select class="search" id="dtopic"><option value="">All topics</option>${topics}</select>
    <div id="dict-body">${dictBody()}</div>`;
}

function wordView(id) {
  const it = byId(id);
  if (!it) return dictView();
  const u = UNIT_OF[id], c = S.cards[id];
  return `<a class="back" href="#/dictionary">‹ Words</a>
    <div class="card" style="min-height:0;margin-top:6px"><div class="big">${esc(it.pulaar)}</div>${badge(it)}
      <div class="lab">${esc(it.english)}</div>${it.french ? `<div class="hint">FR: ${esc(it.french)}</div>` : ""}
      ${it.hassaniya ? `<div class="hint">Hassaniya: ${esc(it.hassaniya)}</div>` : ""}</div>
    ${usageBlock(it)}
    <h2>Your notes</h2>${noteBox(id)}
    <h2>Details</h2>
    <p class="sub">Topic: <a href="#/unit/${u.id}">${esc(u.title)}</a><br>
      Status: ${learned(id) ? "learned" : c ? "in progress" : "not studied yet"}${c ? ` (box ${c.box} of 5)` : ""}</p>`;
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

// ---------- Alphabet, trip phrases, role-plays ----------
const GROUPS = [["vowel", "Short vowels"], ["long-vowel", "Double vowels"], ["consonant", "Consonants"],
  ["implosive", "Implosives (ɓ ɗ ƴ)"], ["prenasalized", "Prenasalized"]];
function alphabetView() {
  const A = DATA.alphabet;
  const sections = GROUPS.map(([g, label]) => {
    const ls = A.letters.filter(l => l.group === g);
    return ls.length ? `<h2>${label}</h2><div class="tiles">${ls.map(l => `<div class="tile"><b>${esc(l.letter)}</b>
      <small>${l.like ? `like “${esc(l.like)}”` : "no English match"}</small></div>`).join("")}</div>` : "";
  }).join("");
  return `<a class="back" href="#/path">‹ Path</a><h1>${esc(A.title)}</h1><p class="sub">${esc(A.description)}</p>${sections}`;
}

function tripView() {
  const groups = DATA.units.map(u => ({ u, items: u.items.filter(i => (i.tags || []).includes("essential")) })).filter(g => g.items.length);
  return `<a class="back" href="#/learn">‹ Learn</a><h1>Trip phrases</h1><p class="sub">The essentials, one tap away.</p>
    ${groups.map(g => `<h2>${esc(g.u.title)}</h2>${g.items.map(i => `<div class="trip"><b>${esc(i.pulaar)}</b><span>${esc(i.english)}</span>${i.usage ? `<small>${esc(i.usage)}</small>` : ""}</div>`).join("")}`).join("")}`;
}

function roleplayList() {
  return `<a class="back" href="#/path">‹ Path</a><h1>Role-plays</h1>
    <p class="sub">Short conversations built from verified phrases. Pick the right reply.</p>
    <div style="margin-top:16px">${DATA.dialogues.map(d => `<button class="unit" data-act="rp-start" data-id="${d.id}">
      <div class="ico alt">💬</div><div style="flex:1"><b>${esc(d.title)}</b><span class="sub">${esc(d.description)}</span></div></button>`).join("")}</div>`;
}

const bubble = t => `<div class="bub ${t.speaker}"><b>${esc(t.pulaar)}</b><small>${esc(t.english)}</small></div>`;
function roleplayView() {
  const s = session, d = s.d, done = s.i >= d.turns.length;
  const log = s.log.map(bubble).join("");
  const head = `<div class="sess-top"><button class="x" data-act="end" aria-label="Close">×</button>
    <div class="dashes">${d.turns.map((t, k) => `<i class="${k < s.i ? "c" : ""}"></i>`).join("")}</div></div><div class="q-lab">${esc(d.title)}</div>`;
  if (done) {
    return `${head}<div class="chat">${log}</div><div class="empty"><div class="big">Conversation done</div>
      <p class="sub">${s.right} of ${s.replies} replies right the first time. +${s.xp} XP</p>
      <button class="btn" data-act="end" style="margin-top:16px">Done</button></div>`;
  }
  const t = d.turns[s.i];
  if (t.speaker === "them") {
    return `${head}<div class="chat">${log}${bubble(t)}</div><div class="sheet plain"><div><button class="btn" data-act="rp-next">Continue</button></div></div>`;
  }
  if (!s.opts) s.opts = shuffle([t, ...t.distractors]);
  const opts = s.opts.map((o, k) => {
    const cls = s.picked == null ? "" : o.id === t.id ? "ok" : k === s.picked ? "bad" : "";
    return `<button class="opt ${cls}" data-rp="${k}" ${s.picked != null ? "disabled" : ""}>${esc(o.pulaar)}</button>`;
  }).join("");
  const right = s.picked != null && s.opts[s.picked].id === t.id;
  const sheet = s.picked == null ? "" : `<div class="sheet ${right ? "ok" : "bad"}"><div><b>${right ? "Exactly!" : "Not quite"}</b>
    <p>${right ? esc(t.english) : `Better: ${esc(t.pulaar)} (${esc(t.english)})`}</p><button class="btn" data-act="rp-next">Continue</button></div></div>`;
  return `${head}<div class="chat">${log}</div><div class="q-lab">Your reply</div>${opts}${sheet}`;
}

function startRoleplay(id) {
  const d = DATA.dialogues.find(x => x.id === id);
  if (d) { session = { kind: "roleplay", d, i: 0, log: [], opts: null, picked: null, right: 0, replies: 0, wrongHere: false, xp: 0 }; render(); }
}
function rpPick(k) {
  const s = session, t = s.d.turns[s.i];
  if (s.picked != null) return;
  s.picked = k;
  if (s.opts[k].id === t.id) { if (!s.wrongHere) { s.right++; s.xp += 5; S.xp += 5; } touch(); save(); }
  else s.wrongHere = true;
  render();
}
function rpNext() {
  const s = session, t = s.d.turns[s.i];
  if (t.speaker === "you") {
    if (s.picked == null || s.opts[s.picked].id !== t.id) { // wrong: let them try again on the same turn
      s.picked = null; render(); return;
    }
    s.replies++;
  }
  s.log.push(t); s.i++; s.opts = null; s.picked = null; s.wrongHere = false; render();
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
    <h2>Backup</h2>
    <p class="sub">Save your progress and notes, or restore them on another device. Clearing Safari's website data erases progress, so back up before you travel.</p>
    <div class="row" style="margin-top:10px"><button class="btn alt" data-act="export-file" style="margin:0">Save file</button>
      <button class="btn alt" data-act="export-copy" style="margin:0">Copy code</button></div>
    <textarea class="note" id="imp" rows="3" placeholder="Paste a backup code here to restore" style="margin-top:12px"></textarea>
    <div class="row"><button class="btn" data-act="import-text" style="margin:0">Restore from code</button>
      <label class="btn alt" style="margin:0">From file<input type="file" id="impfile" accept=".json,application/json" hidden></label></div>
    <p id="bk-msg" class="sub" role="status"></p>
    <h2>About this content</h2>
    <p class="sub">${total} phrases from a Mauritania-specific Pulaar course. ${review} are marked “check spelling” until a native speaker confirms them.</p>
    <button class="link" data-act="reset">Reset progress</button>`;
}

// ---------- Backup ----------
const backupText = () => JSON.stringify({ app: "fuuta", version: 1, exportedAt: new Date().toISOString(),
  data: { xp: S.xp, streak: S.streak, lastDay: S.lastDay, cards: S.cards, notes: S.notes, mode: S.mode } });

function parseBackup(txt) {
  let o;
  try { o = JSON.parse(txt.trim()); } catch { return { error: "That isn't a valid backup." }; }
  if (!o || o.app !== "fuuta" || o.version !== 1 || typeof o.data !== "object" || !o.data) return { error: "That isn't a Fuuta backup." };
  const d = o.data, num = n => typeof n === "number" && Number.isFinite(n);
  if (!num(d.xp) || !d.cards || typeof d.cards !== "object") return { error: "The backup is incomplete." };
  const cards = {}, notes = {};
  for (const [id, c] of Object.entries(d.cards)) if (c && num(c.box) && c.box >= 0 && c.box <= 5 && num(c.due)) cards[id] = { box: Math.floor(c.box), due: c.due };
  for (const [id, t] of Object.entries(d.notes || {})) if (typeof t === "string" && t) notes[id] = t.slice(0, 2000);
  return { data: { xp: d.xp, streak: num(d.streak) ? d.streak : 0, lastDay: num(d.lastDay) ? d.lastDay : null, cards, notes, mode: d.mode === "e2p" ? "e2p" : "p2e" } };
}

let pendingImport = null;
const bkMsg = t => { const m = $("#bk-msg"); if (m) m.textContent = t; };
function stageImport(txt) {
  const r = parseBackup(txt);
  if (r.error) { pendingImport = null; return bkMsg(r.error); }
  pendingImport = r.data;
  bkMsg(`Found ${Object.keys(r.data.cards).length} cards and ${Object.keys(r.data.notes).length} notes. This replaces your current progress. Tap Restore again to confirm.`);
}
function applyImport() { S = { ...fresh(), ...pendingImport }; pendingImport = null; save(); render(); bkMsg("Restored."); }

async function exportCopy() {
  const txt = backupText();
  try { await navigator.clipboard.writeText(txt); bkMsg("Backup code copied. Paste it somewhere safe."); }
  catch { const t = $("#imp"); t.value = txt; t.select(); bkMsg("Couldn't copy automatically. Select all and copy the code above."); }
}
function exportFile() {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([backupText()], { type: "application/json" }));
  a.download = `fuuta-progress-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  bkMsg("Backup file saved.");
}

// ---------- events ----------
const byId = id => ITEMS.find(i => i.id === id);

document.addEventListener("click", e => {
  if (e.target.closest("textarea, input, label")) return; // typing/choosing a file must not flip cards
  const t = e.target.closest("[data-act],[data-go],[data-mode],[data-opt],[data-dict-f],[data-rp]");
  if (!t) return;
  if (t.dataset.rp != null) return rpPick(+t.dataset.rp);
  if (t.dataset.go) return go(t.dataset.go);
  if (t.dataset.dictF) { DICT.f = t.dataset.dictF; return render(); }
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
    case "rp-start": return startRoleplay(t.dataset.id);
    case "rp-next": return rpNext();
    case "export-file": return exportFile();
    case "export-copy": return exportCopy();
    case "import-text": {
      const txt = $("#imp").value;
      if (pendingImport && txt === stagedText) return applyImport();
      stagedText = txt; return stageImport(txt);
    }
    case "reset":
      if (t.dataset.sure) { S = fresh(); save(); return render(); }
      t.dataset.sure = "1"; t.textContent = "Tap again to erase all progress"; return;
  }
});

let stagedText = "";
document.addEventListener("input", e => {
  const el = e.target;
  if (el.dataset.note) { // personal note, saved as you type
    const t = el.value.slice(0, 2000);
    if (t.trim()) S.notes[el.dataset.note] = t; else delete S.notes[el.dataset.note];
    return save();
  }
  if (el.id === "dq") { DICT.q = el.value; $("#dict-body").innerHTML = dictBody(); }
});
document.addEventListener("change", e => {
  if (e.target.id === "dtopic") { DICT.topic = e.target.value; $("#dict-body").innerHTML = dictBody(); }
  if (e.target.id === "impfile" && e.target.files[0]) {
    e.target.files[0].text().then(txt => { $("#imp").value = txt; stagedText = txt; stageImport(txt); e.target.value = ""; });
  }
});

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
