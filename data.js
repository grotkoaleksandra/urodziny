// Data layer: Supabase (live) or localStorage (demo). Same API for both.
(() => {
  const cfg = window.INVITE;
  const live = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const sb = live ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const KEY = "invite-demo-rsvps-v2";
  const ok = ({ data, error }) => { if (error) throw error; return data; };
  const loadDemo = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const saveDemo = (rows) => { try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch {} };

  window.InviteData = {
    mode: live ? "live" : "demo",

    // guest
    async submitRsvp(name, answers) {
      if (live) return ok(await sb.rpc("submit_rsvp", { p_slug: cfg.eventSlug, p_name: name, p_answers: answers }));
      const rows = loadDemo();
      rows.push({ id: Math.random().toString(36).slice(2), name, answers, created_at: new Date().toISOString() });
      saveDemo(rows);
    },

    // host
    async session() { return live ? ok(await sb.auth.getSession()).session : { demo: true }; },
    onAuth(cb) { if (live) sb.auth.onAuthStateChange((_e, s) => cb(s)); },
    async signIn(email) {
      ok(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href.split("#")[0] } }));
    },
    async signOut() { if (live) await sb.auth.signOut(); },
    async getEvent() {
      if (!live) return { id: "demo", slug: cfg.eventSlug };
      let ev = ok(await sb.from("events").select("*").eq("slug", cfg.eventSlug).maybeSingle());
      if (!ev) ev = ok(await sb.from("events").insert({ slug: cfg.eventSlug }).select().single());
      return ev;
    },
    async listRsvps(ev) {
      if (!live) return loadDemo();
      return ok(await sb.from("rsvps").select("*").eq("event_id", ev.id).order("created_at"));
    },
    async deleteRsvp(ev, row) {
      if (!live) { saveDemo(loadDemo().filter((r) => r.id !== row.id)); return; }
      ok(await sb.from("rsvps").delete().eq("id", row.id));
    },
    resetDemo() { try { localStorage.removeItem(KEY); } catch {} },
  };
})();
