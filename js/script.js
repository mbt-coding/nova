"use strict";
const $ = i => document.getElementById(i);
const KEY = "nova2";
let D = { chats: [], cur: null, theme: "dark" };
try { const s = JSON.parse(localStorage.getItem(KEY) || "{}"); D.chats = s.chats || []; D.cur = s.cur || null; D.theme = s.theme || "dark"; } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} };
let busy = 0, st = "idle", speaking = 0, lst = 0, ctrl = null, ki = 0;
try { ki = +(sessionStorage.getItem("ki") || 0); } catch (e) {}
const chat = () => D.chats.find(c => c.id == D.cur);
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const md = t => t.split("```").map((p, i) => i % 2 ? `<pre>${esc(p.replace(/^[\w-]*\n/, ""))}</pre>` : esc(p).replace(/`([^`\n]+)`/g, "<code>$1</code>").replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>")).join("");
function toast(t) { const e = $("toast"); e.textContent = t; e.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove("on"), 2800); }
function setSt(s) { st = s; $("stx").textContent = { idle: "Ready", listening: "Listening…", thinking: "Thinking…", speaking: "Speaking…" }[s]; }
function render() {
  const c = chat(), m = c ? c.m : [];
  $("app").classList.toggle("chatting", m.length > 0 || !!busy);
  $("msgs").innerHTML = m.map((x, i) => `<div class="m ${x.r}${x.err ? " err" : ""}">${md(x.c)}${x.r == "a" ? `<div class="ac"><button data-cp="${i}">Copy</button>${i == m.length - 1 && !x.err ? '<button data-rg="1">Redo</button>' : ""}</div>` : ""}</div>`).join("") + (busy ? '<div class="m a"><span class="dots"><i></i><i></i><i></i></span></div>' : "");
  $("main").scrollTop = $("main").scrollHeight;
  $("go").textContent = busy ? "■" : "➤";
  $("go").disabled = !busy && !$("in").value.trim();
  $("hl").innerHTML = D.chats.map(x => `<div class="hi"><button data-o="${x.id}">${esc(x.t)}</button><button data-d="${x.id}" aria-label="Delete chat">🗑</button></div>`).join("") || '<p class="note">No chats yet.</p>';
}
function newChat() { const c = { id: Date.now(), t: "New chat", m: [] }; D.chats.unshift(c); D.cur = c.id; save(); render(); }

/* ---------- AI with automatic key rotation ---------- */
function local(t) {
  if (/^[\d+\-*/().%\s^]+$/.test(t) && /\d/.test(t)) { try { const v = Function('"use strict";return (' + t.replace(/\^/g, "**") + ")")(); if (isFinite(v)) return `${t} = ${+v.toPrecision(12)}\n\n(Local mode)`; } catch (e) {} }
  if (/\btime\b/i.test(t)) return "It's " + new Date().toLocaleTimeString() + ".\n\n(Local mode)";
  if (/\b(date|day|today)\b/i.test(t)) return "Today is " + new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }) + ".\n\n(Local mode)";
  return "I'm in **Local mode** because no API key is set. I can do maths (try `12*(3+4)`), the time and the date. Add keys in `js/config.js` for full AI chat.";
}
function build(key, h) {
  const c = CONFIG, role = x => x.r == "u" ? "user" : "assistant";
  if (c.provider == "openai") return { url: "https://api.openai.com/v1/chat/completions", hd: { "Content-Type": "application/json", Authorization: "Bearer " + key }, body: { model: c.model, messages: [{ role: "system", content: c.system }, ...h.map(x => ({ role: role(x), content: x.c }))] }, pick: d => d.choices[0].message.content };
  if (c.provider == "gemini") return { url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.model)}:generateContent?key=${encodeURIComponent(key)}`, hd: { "Content-Type": "application/json" }, body: { systemInstruction: { parts: [{ text: c.system }] }, contents: h.map(x => ({ role: x.r == "u" ? "user" : "model", parts: [{ text: x.c }] })) }, pick: d => d.candidates[0].content.parts.map(p => p.text || "").join("") };
  return { url: "https://api.anthropic.com/v1/messages", hd: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: { model: c.model, max_tokens: 1024, system: c.system, messages: h.map(x => ({ role: role(x), content: x.c })) }, pick: d => (d.content || []).map(p => p.text || "").join("") };
}
async function ask(m) {
  const h = m.slice(-30), keys = (CONFIG.keys || []).filter(k => k && k.trim());
  if (!keys.length) return local(h[h.length - 1].c);
  for (let n = 0; n < keys.length; n++) {
    const i = (ki + n) % keys.length, b = build(keys[i], h);
    let r;
    try { r = await fetch(b.url, { method: "POST", headers: b.hd, body: JSON.stringify(b.body), signal: ctrl.signal }); }
    catch (e) { if (e.name == "AbortError") throw e; throw Error("Couldn't reach the AI service. Check your connection."); }
    if (r.ok) { ki = i; try { sessionStorage.setItem("ki", i); } catch (e) {} const d = await r.json(); let o; try { o = b.pick(d); } catch (e) { throw Error("Unexpected response format"); } return o || "(empty reply)"; }
    const t = await r.text();
    if (![401, 402, 403, 429].includes(r.status) && !/quota|credit|limit|billing/i.test(t)) throw Error(`AI error ${r.status}: ${t.slice(0, 160)}`);
    toast(`Key ${i + 1} is at its limit, switching…`);
  }
  throw Error("All API keys have reached their limit or are invalid. Try again later or add another key in js/config.js.");
}
async function send(t, voice) {
  t = (t || "").trim(); if (!t || busy) return;
  if (!chat()) newChat();
  const c = chat(); c.m.push({ r: "u", c: t }); if (c.t == "New chat") c.t = t.slice(0, 32);
  $("in").value = ""; grow(); busy = 1; ctrl = new AbortController(); setSt("thinking"); render();
  try { const a = await ask(c.m); c.m.push({ r: "a", c: a }); if (voice) say(a); }
  catch (e) { if (e.name != "AbortError") c.m.push({ r: "a", c: e.message, err: 1 }); else toast("Stopped"); }
  busy = 0; if (!speaking && !lst) setSt("idle"); save(); render();
}

/* ---------- voice ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition; let rec = null;
function mic() {
  if (!SR) { toast("Voice input isn't supported in this browser. Try Chrome or Safari."); return; }
  if (lst) { rec.stop(); return; }
  if (window.speechSynthesis) speechSynthesis.cancel();
  rec = new SR(); rec.interimResults = true; rec.lang = navigator.language || "en-US"; let fin = "";
  rec.onstart = () => { lst = 1; setSt("listening"); $("mic").classList.add("on"); };
  rec.onresult = e => { let s = ""; for (const r of e.results) s += r[0].transcript; fin = s; $("in").value = s; grow(); };
  rec.onerror = e => toast("Microphone: " + e.error);
  rec.onend = () => { lst = 0; $("mic").classList.remove("on"); if (!busy && !speaking) setSt("idle"); if (fin.trim()) send(fin, true); };
  try { rec.start(); } catch (e) { toast(e.message); }
}
function say(t) {
  if (!window.speechSynthesis) return; speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t.replace(/```[\s\S]*?```/g, " code block ").replace(/[*`#]/g, ""));
  u.onstart = () => { speaking = 1; setSt("speaking"); }; u.onend = u.onerror = () => { speaking = 0; if (!busy && !lst) setSt("idle"); };
  speechSynthesis.speak(u);
}

/* ---------- UI ---------- */
function grow() { const e = $("in"); e.style.height = "auto"; e.style.height = Math.min(120, e.scrollHeight) + "px"; $("go").disabled = !busy && !e.value.trim(); }
$("in").oninput = grow;
$("in").onkeydown = e => { if (e.key == "Enter" && !e.shiftKey) { e.preventDefault(); send($("in").value); } };
$("go").onclick = () => { if (busy) ctrl.abort(); else send($("in").value); };
$("mic").onclick = mic;
$("hb").onclick = () => { render(); $("hist").classList.add("on"); };
$("sb").onclick = () => $("set").classList.add("on");
document.querySelectorAll("[data-x]").forEach(b => b.onclick = () => $(b.dataset.x).classList.remove("on"));
$("nc").onclick = () => { newChat(); $("hist").classList.remove("on"); };
$("clr").onclick = () => { D.chats = []; D.cur = null; save(); render(); toast("All chats deleted"); };
$("ex").onclick = () => {
  const c = chat(); if (!c || !c.m.length) { toast("Nothing to export yet"); return; }
  const txt = c.m.map(x => (x.r == "u" ? "You: " : "NOVA: ") + x.c).join("\n\n"), a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([txt], { type: "text/plain" })); a.download = "nova-chat.txt"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$("hl").onclick = e => { const o = e.target.dataset.o, d = e.target.dataset.d; if (o) { D.cur = +o; save(); render(); $("hist").classList.remove("on"); } else if (d) { D.chats = D.chats.filter(c => c.id != d); if (D.cur == d) D.cur = null; save(); render(); } };
$("msgs").onclick = e => {
  const c = chat(), i = e.target.dataset.cp;
  if (i != null) { try { navigator.clipboard.writeText(c.m[+i].c); toast("Copied"); } catch (x) { toast("Copy not available"); } }
  else if (e.target.dataset.rg && !busy) { c.m.pop(); const l = c.m.pop(); if (l) send(l.c); else render(); }
};
["Explain black holes simply", "Write a short poem about stars", "Give me a 3-day Tokyo itinerary", "Help me plan a study schedule"].forEach(t => { const b = document.createElement("button"); b.textContent = t; b.onclick = () => send(t); $("chips").appendChild(b); });
function theme() { document.documentElement.dataset.theme = D.theme; $("td").classList.toggle("sel", D.theme == "dark"); $("tl").classList.toggle("sel", D.theme == "light"); const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = D.theme == "dark" ? "#0a0507" : "#fff5f5"; }
$("td").onclick = () => { D.theme = "dark"; theme(); save(); };
$("tl").onclick = () => { D.theme = "light"; theme(); save(); };

/* ---------- red black hole orb with emitted particles ---------- */
const cv = $("orb"), g = cv.getContext("2d"), RM = matchMedia("(prefers-reduced-motion:reduce)").matches;
let yaw = 0, pit = .38, T = 0, drag = null, spin = 1, mv = 0;
const PT = []; for (let i = 0; i < 560; i++) { const r = .3 + Math.pow(Math.random(), 1.5) * .7; PT.push({ r, a: Math.random() * 6.2832, y: (Math.random() - .5) * .05 * r, s: .6 + Math.random() * .8 }); }
const EM = [];
function spawn(n) {
  for (let i = 0; i < n && EM.length < 420; i++) {
    const a = Math.random() * 6.2832, c = Math.cos(a), s = Math.sin(a), jet = Math.random() < .3, vr = .004 + Math.random() * .01, vt = .012 + Math.random() * .01;
    EM.push(jet ? { x: c * .05, y: 0, z: s * .05, vx: c * .001, vy: (Math.random() < .5 ? -1 : 1) * (.012 + Math.random() * .014), vz: s * .001, l: 1, k: .008 + Math.random() * .01 }
      : { x: c * .29, y: (Math.random() - .5) * .02, z: s * .29, vx: c * vr - s * vt, vy: 0, vz: s * vr + c * vt, l: 1, k: .008 + Math.random() * .012 });
  }
}
function frame() {
  requestAnimationFrame(frame);
  const d = devicePixelRatio || 1, W = Math.round(cv.clientWidth * d); if (!W) return;
  if (cv.width != W || cv.height != W) { cv.width = cv.height = W; }
  const target = { idle: 1, listening: 2, thinking: 4.5, speaking: 2.2 }[st]; spin += (target - spin) * .06;
  const dt = RM ? 0 : .012 * spin; T += dt;
  const ac = getComputedStyle(document.documentElement).getPropertyValue("--ac").trim() || "#ff3b4e", pulse = st == "idle" ? 1 : 1 + .08 * Math.sin(T * 40);
  const R = W * .46, rc = R * .27 * pulse, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pit), sp = Math.sin(pit);
  const pj = (x, y, z) => { const x2 = x * cy + z * sy, z2 = -x * sy + z * cy, y3 = y * cp - z2 * sp, z3 = y * sp + z2 * cp, f = 1 / (1 + z3 * .25); return { x: W / 2 + x2 * R * f, y: W / 2 + y3 * R * f, z: z3, f }; };
  g.clearRect(0, 0, W, W); g.globalCompositeOperation = "lighter";
  const h = g.createRadialGradient(W / 2, W / 2, rc * .8, W / 2, W / 2, R); h.addColorStop(0, "rgba(255,70,60,.55)"); h.addColorStop(.4, "rgba(255,50,70,.16)"); h.addColorStop(1, "rgba(255,40,60,0)");
  g.fillStyle = h; g.beginPath(); g.arc(W / 2, W / 2, R, 0, 6.2832); g.fill();
  const L = PT.map(p => { const w = 2.4 / Math.pow(p.r, 1.5) * p.s, a = p.a + T * w, q = pj(Math.cos(a) * p.r, p.y, Math.sin(a) * p.r), a0 = a - dt * w * 5, q0 = pj(Math.cos(a0) * p.r, p.y, Math.sin(a0) * p.r); return { q, q0, p, k: 1 - (p.r - .3) / .7, s: p.s, a: .35 + .55 * Math.min(1, q.f * .9) }; });
  spawn(RM ? 0 : Math.round(2 + spin * 1.5));
  for (let i = EM.length - 1; i >= 0; i--) { const e = EM[i], f = 1 + spin * .6; e.x += e.vx * f; e.y += e.vy * f; e.z += e.vz * f; e.l -= e.k; if (e.l <= 0) EM.splice(i, 1); }
  EM.forEach(e => { const f = 1 + spin * .6; L.push({ q: pj(e.x, e.y, e.z), q0: pj(e.x - e.vx * 4 * f, e.y - e.vy * 4 * f, e.z - e.vz * 4 * f), k: .2 + e.l * .8, s: .7, a: Math.max(0, e.l) * .9, em: 1 }); });
  L.sort((m, n) => n.q.z - m.q.z);
  const dr = o => { g.strokeStyle = `hsla(${8 + o.k * 38},100%,${55 + o.k * 38}%,${o.a})`; g.lineWidth = Math.max(d, R * .011 * o.q.f * o.s); g.lineCap = "round"; g.beginPath(); g.moveTo(o.q0.x, o.q0.y); g.lineTo(o.q.x, o.q.y); g.stroke(); };
  L.filter(o => o.q.z > 0).forEach(dr);
  g.globalCompositeOperation = "source-over"; g.fillStyle = "#000"; g.beginPath(); g.arc(W / 2, W / 2, rc, 0, 6.2832); g.fill();
  g.globalCompositeOperation = "lighter"; g.lineWidth = Math.max(d * 1.5, R * .016); g.strokeStyle = "rgba(255,190,150,.9)"; g.beginPath(); g.arc(W / 2, W / 2, rc * 1.04, 0, 6.2832); g.stroke();
  g.lineWidth = R * .05; g.strokeStyle = ac; g.globalAlpha = .25; g.beginPath(); g.arc(W / 2, W / 2, rc * 1.12, 0, 6.2832); g.stroke(); g.globalAlpha = 1;
  L.filter(o => o.q.z <= 0).forEach(dr); g.globalCompositeOperation = "source-over";
}
cv.onpointerdown = e => { drag = [e.clientX, e.clientY]; mv = 0; cv.setPointerCapture(e.pointerId); };
cv.onpointermove = e => { if (!drag) return; const dx = e.clientX - drag[0], dy = e.clientY - drag[1]; mv += Math.abs(dx) + Math.abs(dy); yaw += dx * .012; pit = Math.max(-1.3, Math.min(1.3, pit + dy * .012)); drag = [e.clientX, e.clientY]; };
cv.onpointerup = () => { drag = null; if (mv < 6 && speaking) { speechSynthesis.cancel(); speaking = 0; setSt("idle"); } };
if (!SR) $("mic").title = "Voice input isn't supported in this browser";
theme(); if (!D.chats.find(c => c.id == D.cur)) D.cur = null; render(); frame();
