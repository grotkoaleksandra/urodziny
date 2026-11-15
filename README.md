# Septem of Swords: envelope invite + RSVP

A cream envelope with an oxblood wax seal. Tap the seal and it cracks, the flap opens, and a Seven of Swords tarot card rises out. Tap the card and it flips to show the party info. RSVP sits below, and replies land on a private guest list.

## Files
- `index.html`, `invite.css`, `invite.js`: the invite
- `halftone.js`: turns any photo into ink dots for the card (and draws the stand-in figure until the photo exists)
- `config.js`: **everything editable**: text (PL/EN), time, address, seal initials and wax colour, card photo, RSVP fields
- `admin.html`, `admin.js`: the guest list (confirmed, +1s, messages, CSV)
- `data.js`: saving (demo = this browser only, live = Supabase)
- `supabase/schema.sql`: database setup

## Add the photo
Put it in `photo/` (e.g. `photo/ola.jpg`) and set `card.photo` in `config.js`. Use a plain, light background with strong light and shadow, which halftones best. The card window is tall (about 3:4).

## Go live
1. Supabase: create a project (or reuse one). In the SQL Editor, run `supabase/schema.sql`.
2. In Authentication → URL Configuration, add `https://<subdomain>.cotoaleksandra.com/admin.html` to the redirect URLs.
3. Put the project URL and anon key in `config.js`.
4. Push to a GitHub repo, then turn on Pages. Add a CNAME for the subdomain at Cloudflare (DNS only, grey cloud).
5. Open `/admin.html` and log in with your email. That creates the event, so do it **before** sending the link.

## Still placeholders
Photo, time (20:00?), address, seal initials, note text (draft), link-preview image.
