// rsvp: saves a guest's reply and, for a "yes" with an email, sends them the
// opened invite (card images + details + .ics). The email content comes only
// from the host's own site (event.json), never from the request, so this
// can't be used to send arbitrary mail.
//
// Secrets used: RESEND_API_KEY, CONTACT_NOTIFY_TO (reply-to), plus the
// built-in SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

const EVENTS: Record<string, { site: string; from: string }> = {
  "ola-urodziny-2026": {
    site: "https://urodziny.cotoaleksandra.com",
    from: "Ola · Septem of Swords <zaproszenie@cotoaleksandra.com>",
  },
};
const ALLOWED_ORIGINS = ["https://urodziny.cotoaleksandra.com", "http://localhost:8830"];

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type L10n = { pl: string; en: string };
type EventContent = {
  host: string; title: L10n; date: string; time: string; tz: string; durationHours?: number;
  place: string; address: L10n; mapUrl?: string; note: L10n;
};

Deno.serve(async (req) => {
  const headers = cors(req.headers.get("origin"));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const slug = String(body?.slug ?? "");
  const cfg = EVENTS[slug];
  if (!cfg) return json({ error: "unknown event" }, 404);
  const name = String(body?.name ?? "").trim().slice(0, 80);
  if (!name) return json({ error: "name" }, 400);
  const lang: "pl" | "en" = body?.lang === "en" ? "en" : "pl";
  const a = body?.answers ?? {};
  const answers: Record<string, string> = {};
  if (a.attending === "yes" || a.attending === "no") answers.attending = a.attending;
  else return json({ error: "attending" }, 400);
  if (answers.attending === "yes" && (a.plus_one === "yes" || a.plus_one === "no")) answers.plus_one = a.plus_one;
  const email = String(a.email ?? "").trim().toLowerCase().slice(0, 200);
  if (answers.attending === "yes" && email) {
    if (!EMAIL_RE.test(email)) return json({ error: "email" }, 400);
    answers.email = email;
  }
  if (a.message) answers.message = String(a.message).trim().slice(0, 1000);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: ev, error: evErr } = await sb.from("events").select("id").eq("slug", slug).maybeSingle();
  if (evErr || !ev) return json({ error: "event not set up" }, 404);

  const hourAgo = new Date(Date.now() - 3600e3).toISOString();
  const { count } = await sb.from("rsvps").select("id", { count: "exact", head: true }).eq("event_id", ev.id).gte("created_at", hourAgo);
  if ((count ?? 0) > 300) return json({ error: "slow down" }, 429);

  const { error: insErr } = await sb.from("rsvps").insert({ event_id: ev.id, name, answers });
  if (insErr) { console.error(insErr); return json({ error: "save failed" }, 500); }

  // email the opened invite
  let emailed = false;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (answers.attending === "yes" && answers.email && resendKey) {
    try {
      // at most 2 emails to the same address per 10 minutes
      const tenAgo = new Date(Date.now() - 600e3).toISOString();
      const { count: recent } = await sb.from("rsvps").select("id", { count: "exact", head: true })
        .eq("event_id", ev.id).eq("answers->>email", answers.email).gte("created_at", tenAgo);
      if ((recent ?? 0) <= 2) {
        const content: EventContent = await (await fetch(`${cfg.site}/event.json`, { cache: "no-store" })).json();
        const mail = buildEmail(content, cfg.site, lang, name, answers.plus_one === "yes");
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: cfg.from,
            to: [answers.email],
            reply_to: Deno.env.get("CONTACT_NOTIFY_TO") || undefined,
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
            attachments: [{ filename: "septem-of-swords.ics", content: encodeBase64(new TextEncoder().encode(mail.ics)) }],
          }),
        });
        if (res.ok) emailed = true;
        else console.error("Resend failed:", res.status, await res.text());
      }
    } catch (e) { console.error("email error:", e); }
  }
  return json({ ok: true, emailed });
});

function buildEmail(c: EventContent, site: string, lang: "pl" | "en", name: string, plusOne: boolean) {
  const T = lang === "pl"
    ? { subject: `Twoje zaproszenie: ${c.title.pl} · ${dd(c.date)}`, hi: `Cześć ${name},`, list: "Jesteś na liście",
        sub: "Oto Twoje zaproszenie, już otwarte.", date: "Kiedy", time: "Godzina", place: "Gdzie", map: "mapa",
        plus: "Będziesz z osobą towarzyszącą.", open: "Otwórz zaproszenie", cal: "W załączniku plik do kalendarza.",
        change: "Coś się zmieniło? Po prostu odpisz na tego maila." }
    : { subject: `Your invitation: ${c.title.en} · ${dd(c.date)}`, hi: `Hi ${name},`, list: "You're on the list",
        sub: "Here's your invitation, already opened.", date: "Date", time: "Time", place: "Place", map: "map",
        plus: "You're bringing a +1.", open: "Open the invitation", cal: "A calendar file is attached.",
        change: "Plans changed? Just reply to this email." };
  const start = new Date(`${c.date}T${c.time}:00${c.tz}`);
  const end = new Date(start.getTime() + (c.durationHours ?? 6) * 3600e3);
  const dateLong = start.toLocaleDateString(lang === "pl" ? "pl-PL" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Warsaw" });
  const map = c.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.place)}`;
  const address = c.address[lang];
  const note = c.note[lang];
  const ink = "#2a2926", paper = "#e9e8e4", font = "'Inter Tight','Helvetica Neue',Helvetica,Arial,sans-serif";
  const row = (k: string, v: string) =>
    `<tr><td style="padding:10px 0;border-top:1px solid #b9b7b1;font:800 12px ${font};text-transform:uppercase;letter-spacing:-.2px;color:${ink}">${k}</td>
     <td align="right" style="padding:10px 0;border-top:1px solid #b9b7b1;font:italic 15px ${font};color:${ink}">${v}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;background:${paper}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${paper}"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
  <tr><td style="font:600 11px ${font};text-transform:uppercase;color:${ink}">cotoaleksandra</td>
      <td align="right" style="font:600 11px ${font};text-transform:uppercase;color:${ink}">${esc(dd(c.date))}</td></tr>
  <tr><td colspan="2" align="center" style="padding:34px 0 6px;font:italic 17px Georgia,serif;color:${ink}">${esc(T.hi)}</td></tr>
  <tr><td colspan="2" align="center" style="font:800 38px/1 ${font};letter-spacing:-2.5px;text-transform:uppercase;color:${ink}">${esc(T.list)}</td></tr>
  <tr><td colspan="2" align="center" style="padding:10px 0 26px;font:15px ${font};color:#6a6863">${esc(T.sub)}</td></tr>
  <tr><td colspan="2" align="center">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding:0 6px"><a href="${site}/?open=1&lang=${lang}"><img src="${site}/img/card-front.jpg" width="264" alt="Septem of Swords, VII" style="display:block;width:264px;max-width:100%;height:auto;border:0"></a></td>
      <td style="padding:0 6px"><a href="${site}/?open=1&lang=${lang}"><img src="${site}/img/card-back-${lang}.jpg" width="264" alt="${esc(c.title[lang])}" style="display:block;width:264px;max-width:100%;height:auto;border:0"></a></td>
    </tr></table></td></tr>
  <tr><td colspan="2" style="padding-top:30px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${row(T.date, esc(dateLong))}
    ${row(T.time, esc(c.time))}
    ${row(T.place, `${esc(c.place)}<br>${esc(address)} · <a href="${esc(map)}" style="color:${ink}">${T.map} ↗</a>`)}
    <tr><td colspan="2" style="border-top:1px solid #b9b7b1"></td></tr></table></td></tr>
  <tr><td colspan="2" style="padding:22px 0 0;font:15px/1.5 ${font};color:${ink}">${esc(note)}</td></tr>
  ${plusOne ? `<tr><td colspan="2" style="padding:12px 0 0;font:600 13px ${font};text-transform:uppercase;color:${ink}">${esc(T.plus)}</td></tr>` : ""}
  <tr><td colspan="2" align="center" style="padding:30px 0 10px">
    <a href="${site}/?open=1&lang=${lang}" style="display:block;background:${ink};color:${paper};text-decoration:none;padding:17px;font:800 14px ${font};text-transform:uppercase;letter-spacing:-.3px">${esc(T.open)} →</a></td></tr>
  <tr><td colspan="2" align="center" style="padding:6px 0 0;font:12px ${font};color:#6a6863">${esc(T.cal)} ${esc(T.change)}</td></tr>
  <tr><td colspan="2" align="right" style="padding:26px 0 0;font:italic 30px Georgia,serif;color:${ink}">${esc(c.host)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${T.hi}\n\n${T.list}. ${T.sub}\n\n${T.date}: ${dateLong}\n${T.time}: ${c.time}\n${T.place}: ${c.place}, ${address}\n${map}\n\n${note}\n\n${plusOne ? T.plus + "\n\n" : ""}${T.open}: ${site}/?open=1&lang=${lang}\n\n${T.change}\n\n${c.host}`;
  const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const icsEsc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//cotoaleksandra//invite//EN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:septem-of-swords-${c.date}@cotoaleksandra.com`, `DTSTAMP:${utc(new Date())}`, `DTSTART:${utc(start)}`, `DTEND:${utc(end)}`,
    `SUMMARY:${icsEsc(c.title[lang])}`, `LOCATION:${icsEsc(`${c.place}, ${address}`)}`, `URL:${site}/?open=1`,
    `DESCRIPTION:${icsEsc(note)}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  return { subject: T.subject, html, text, ics };
}
function dd(iso: string) { const [y, m, d] = iso.split("-"); return `${d}.${m}.${y}`; }
