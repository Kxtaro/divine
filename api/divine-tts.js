// =============================================================
// Vercel serverless proxy → ElevenLabs text-to-speech.
// The API key lives ONLY in the Vercel env var ELEVENLABS_API_KEY.
// Returns audio/mpeg bytes the browser can play.
//
// Required Vercel env var:  ELEVENLABS_API_KEY
// Optional:                 DIVINE_VOICE_ID (defaults to Divine's voice)
// =============================================================
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) { res.status(500).json({ error: 'ELEVENLABS_API_KEY is not set in Vercel env vars' }); return; }
  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body || '{}');
    const text = String((body && body.text) || '').slice(0, 1200);
    if (!text) { res.status(400).json({ error: 'text required' }); return; }
    const voiceId = process.env.DIVINE_VOICE_ID || 'ehW5wuRFabtLDsdkFS79';

    const r = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/' + voiceId + '?output_format=mp3_44100_128',
      {
        method: 'POST',
        headers: {
          'xi-api-key': key,
          'content-type': 'application/json',
          'accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
        }),
      }
    );
    if (!r.ok) {
      const t = await r.text();
      res.status(r.status).json({ error: t.slice(0, 300) });
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(buf);
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
