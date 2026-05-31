# Divine — AI voice companion setup

Divine (the angelic orb at the bottom of every page) talks to Claude and
speaks with ElevenLabs through two **serverless functions** in `/api`. The
API keys live ONLY in Vercel environment variables — never in the repo or
the browser.

## 1. Add environment variables in Vercel

Vercel → your project → **Settings → Environment Variables**. Add:

| Name | Value | Notes |
|------|-------|-------|
| `ANTHROPIC_API_KEY` | your Anthropic API key | from console.anthropic.com |
| `ELEVENLABS_API_KEY` | your **new** ElevenLabs key | rotate the old one — see below |
| `DIVINE_MODEL` | `claude-opus-4-8` | optional. Only if `claude-opus-4-5` 404s |
| `DIVINE_VOICE_ID` | `ehW5wuRFabtLDsdkFS79` | optional. Defaults to this voice |

Apply to **Production** (and Preview if you want), then **redeploy** so the
functions pick up the values.

## 2. Rotate the leaked ElevenLabs key

The key that was pasted in chat must be considered compromised. In
ElevenLabs → Profile → API Keys, **revoke it** and create a fresh one, then
put the new one in `ELEVENLABS_API_KEY` above. Do not commit it anywhere.

## 3. How it works

- `api/divine-chat.js` → proxies to Claude (`/v1/messages`).
- `api/divine-tts.js` → proxies to ElevenLabs (`eleven_multilingual_v2`).
- `divine-companion.js` → the orb, mic, speech recognition, voice actions.
- `topbar.js` loads `divine-companion.js` automatically on every page.

## 4. Voice actions

Divine updates localStorage + Supabase when you say things like:

- "I drank two bottles of water"
- "Add magnesium 200mg in the evening"
- "Add finish the report to my goals"
- "Change Monday to push day"

## Notes / limitations

- **Mic:** desktop Chrome/Edge keeps the mic always-on; tap the orb to mute.
  Mobile (iOS Safari / Android Chrome) is **tap-to-talk** — tap the orb to
  speak — because mobile browsers don't allow continuous background listening.
- **Audio on mobile** unlocks on your first tap of the orb (autoplay policy).
- Speech recognition uses the Web Speech API (best in Chrome; partial in Safari).
