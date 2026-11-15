(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const D = window.InviteData;
  let ev = null, rows = [], latest = [];

  const fmt = (iso) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  // Someone may reply twice (e.g. changes their answer): keep the newest per name.
  function dedupe(all) {
    const by = new Map();
    for (const r of [...all].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
      const k = r.name.trim().toLowerCase().replace(/\s+/g, " ");
      const prev = by.get(k);
      by.set(k, { ...r, replies: (prev?.replies || 0) + 1 });
    }
    return [...by.values()];
  }

  function render() {
    latest = dedupe(rows);
    const yes = latest.filter((r) => r.answers?.attending === "yes");
    const no = latest.filter((r) => r.answers?.attending === "no");
    const plus = yes.filter((r) => r.answers?.plus_one === "yes").length;
    const stat = (n, l) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`;
    $("#stats").innerHTML = stat(yes.length + plus, "people coming") + stat(yes.length, "confirmed") + stat(plus, "+1s") + stat(no.length, "can't come");
    $("#c-count").textContent = `${yes.length} + ${plus}`;
    $("#n-count").textContent = no.length;
    const item = (r, i) => `<li>
        <span class="n">${String(i + 1).padStart(2, "0")}</span>
        <span class="nm">${esc(r.name)}</span>
        <span class="plus">${r.answers?.plus_one === "yes" ? "+1" : ""}</span>
        ${r.answers?.message ? `<span class="msg">${esc(r.answers.message)}</span>` : ""}
        <span class="meta">${r.answers?.email ? `<span>${esc(r.answers.email)}</span>` : ""}<span>${fmt(r.created_at)}${r.replies > 1 ? ` · replied ${r.replies}×, showing latest` : ""}</span>
        <button data-del="${esc(r.id)}">remove</button></span></li>`;
    $("#yes").innerHTML = yes.length ? yes.map(item).join("") : '<li class="empty">No one yet.</li>';
    $("#no").innerHTML = no.length ? no.map(item).join("") : '<li class="empty">No one.</li>';
  }

  async function refresh() { rows = await D.listRsvps(ev); render(); }

  document.addEventListener("click", async (e) => {
    const d = e.target.closest("[data-del]");
    if (!d) return;
    const r = latest.find((x) => String(x.id) === d.dataset.del);
    if (!r || !confirm(`Remove ${r.name}'s reply? This can't be undone.`)) return;
    // remove every reply from this person
    const k = r.name.trim().toLowerCase().replace(/\s+/g, " ");
    for (const x of rows.filter((x) => x.name.trim().toLowerCase().replace(/\s+/g, " ") === k)) await D.deleteRsvp(ev, x);
    refresh();
  });

  $("#copy").addEventListener("click", async (e) => {
    const yes = latest.filter((r) => r.answers?.attending === "yes");
    const text = yes.map((r) => r.name + (r.answers?.plus_one === "yes" ? " +1" : "")).join("\n");
    try { await navigator.clipboard.writeText(text); e.target.textContent = "Copied ✓"; }
    catch { prompt("Copy:", text); }
    setTimeout(() => (e.target.textContent = "Copy confirmed names"), 1500);
  });
  $("#csv").addEventListener("click", () => {
    const fields = window.INVITE.rsvpFields.filter((f) => f.id !== "name").map((f) => f.id);
    const out = [["name", ...fields, "replied_at"], ...latest.map((r) => [r.name, ...fields.map((f) => r.answers?.[f] ?? ""), r.created_at])];
    const csv = out.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    a.download = "guest-list.csv"; a.click();
  });
  $("#refresh").addEventListener("click", refresh);
  $("#reset").addEventListener("click", () => { if (confirm("Clear all test answers in this browser?")) { D.resetDemo(); refresh(); } });
  $("#logout").addEventListener("click", async () => { await D.signOut(); location.reload(); });
  $("#login").addEventListener("submit", async (e) => {
    e.preventDefault();
    try { await D.signIn($("#email").value.trim()); $("#login-msg").textContent = "Check your inbox for the login link."; }
    catch (err) { $("#login-msg").textContent = "Couldn't send: " + err.message; }
  });

  async function start(session) {
    if (!session) { $("#login").hidden = false; return; }
    $("#login").hidden = true; $("#app").hidden = false;
    $("#demo").hidden = D.mode !== "demo";
    $("#logout").hidden = D.mode === "demo";
    try { ev = await D.getEvent(); await refresh(); }
    catch (err) { console.error(err); alert("Couldn't load: " + err.message); }
  }
  D.onAuth((s) => { if (s && !ev) start(s); });
  D.session().then(start);
})();
