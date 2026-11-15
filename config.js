// ─────────────────────────────────────────────────────────────
//  Invite config: one event.
//  supabaseUrl / supabaseAnonKey empty → DEMO MODE (answers stay in this browser)
//  filled in → LIVE MODE (answers saved to Supabase, list on admin.html)
// ─────────────────────────────────────────────────────────────
window.INVITE = {
  supabaseUrl: "https://vnkwdfbwplgkcjgvvixp.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZua3dkZmJ3cGxna2NqZ3Z2aXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMTQ3NDcsImV4cCI6MjEwNTU5MDc0N30.ochfjmYWe2bKmjogfmW7WPTGGxWwrgYZN9KW-5Sff4k", // ← paste the anon public key here
  eventSlug: "ola-urodziny-2026",

  // ── look ──
  seal: { initials: "O", wax: "#6e1018" },          // [PLACEHOLDER] initials
  card: {
    number: "VII",
    photo: "photo/ola-seven-of-swords.jpg", // halftoned on the card; empty = swords stand-in
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
      label: { pl: "Czy przyjdziesz z osobą towarzyszącą (+1)?", en: "Are you bringing a +1?" },
      options: [{ v: "yes", pl: "Tak", en: "Yes" }, { v: "no", pl: "Nie", en: "No" }] },
    { id: "email", type: "email", required: true, max: 200, showIf: { attending: "yes" },  // only a "yes" gets the details by email
      label: { pl: "Twój email", en: "Your email" },
      hint: { pl: "Dostaniesz potwierdzenie i wszystkie informacje o imprezie. Email służy tylko do tego, nic więcej.",
              en: "You'll get a confirmation with all the party details. Your email is only used for this, nothing else." } },
    { id: "message", type: "textarea", max: 1000,
      label: { pl: "Wiadomość lub pytanie (opcjonalnie)", en: "Message or question (optional)" } },
  ],
};
