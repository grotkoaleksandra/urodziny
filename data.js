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
    // Live: the "rsvp" edge function saves the reply and, for a yes with an
    // email, sends the opened invite to the guest.
    async submitRsvp(name, answers, lang) {
      if (live) {
        const { data, error } = await sb.functions.invoke("rsvp", { body: { slug: cfg.eventSlug, name, answers, lang } });
        if (error) throw error;
        return data;
      }
      const rows = loadDemo();
      rows.push({ id: Math.random().toString(36).slice(2), name, answers, created_at: new Date().toISOString() });
      saveDemo(rows);
      return { emailed: false };
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
      // first login by the host's email takes ownership (see claim_event in schema.sql)
      await sb.rpc("claim_event", { p_slug: cfg.eventSlug });
      const ev = ok(await sb.from("events").select("*").eq("slug", cfg.eventSlug).maybeSingle());
      if (!ev) throw new Error("This guest list belongs to another account.");
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
