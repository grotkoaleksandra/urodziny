// ─────────────────────────────────────────────────────────────
//  Invite config: one event.
//  supabaseUrl / supabaseAnonKey empty → DEMO MODE (answers stay in this browser)
//  filled in → LIVE MODE (answers saved to Supabase, list on admin.html)
// ─────────────────────────────────────────────────────────────
window.INVITE = {
  supabaseUrl: "https://vnkwdfbwplgkcjgvvixp.supabase.co",
  supabaseAnonKey: "", // ← paste the anon public key here
  eventSlug: "ola-urodziny-2026",

  // ── look ──
  seal: { initials: "O", wax: "#6e1018" },          // [PLACEHOLDER] initials
  card: {
    number: "VII",
    photo: "", // [PLACEHOLDER] e.g. "photo/ola-seven-of-swords.jpg". Empty = drawn stand-in
    titleHeavy: "SEPTEM",
    titleScript: "of Swords",
  },

  // ── content lives in event.json (the email function reads it too) ──
  site: "https://urodziny.cotoaleksandra.com",

  // ── RSVP fields: the business version lets hosts add their own here ──
  rsvpFields: [
    { id: "name", type: "text", required: true, max: 80,
      label: { pl: "Imię i nazwisko", en: "Your name" } },
    { id: "attending", type: "choice", required: true,
      label: { pl: "Będziesz?", en: "Will you come?" },
      options: [{ v: "yes", pl: "Tak", en: "Yes" }, { v: "no", pl: "Nie", en: "No" }] },
    { id: "plus_one", type: "choice", showIf: { attending: "yes" },
      label: { pl: "Z osobą towarzyszącą?", en: "Bringing a +1?" },
      options: [{ v: "yes", pl: "Tak", en: "Yes" }, { v: "no", pl: "Nie", en: "No" }] },
    { id: "email", type: "email", required: true, showIf: { attending: "yes" }, max: 200,
      label: { pl: "Email: wyślę Ci zaproszenie ze wszystkimi informacjami", en: "Email: I'll send you the invite with all the details" } },
    { id: "message", type: "textarea", max: 1000,
      label: { pl: "Wiadomość lub pytanie (opcjonalnie)", en: "Message or question (optional)" } },
  ],
};
