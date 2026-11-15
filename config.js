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

  // ── content (pl / en) ──
  content: {
    host: "Ola",
    scriptName: { pl: "Oli", en: "Ola's" },
    heavyTitle: { pl: "URODZINY", en: "BIRTHDAY" },
    date: "2026-12-12",
    time: "20:00",                                    // [PLACEHOLDER]
    place: "Septem of Swords",
    address: { pl: "adres wkrótce", en: "address soon" }, // [PLACEHOLDER]
    mapUrl: "",
    note: {                                           // draft, edit freely
      pl: "Kończę kolejny rok i bardzo chcę świętować go z Tobą. Będzie muzyka, dobre rzeczy do jedzenia i najbliżsi ludzie. Daj znać, czy będziesz.",
      en: "I'm turning another year older and I'd love to celebrate it with you. There'll be music, good things to eat and my favourite people. Let me know if you can make it.",
    },
  },

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
    { id: "message", type: "textarea", max: 1000,
      label: { pl: "Wiadomość lub pytanie (opcjonalnie)", en: "Message or question (optional)" } },
  ],
};
