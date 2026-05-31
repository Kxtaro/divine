// =============================================================
// Vercel serverless proxy → ElevenLabs speech-to-text (scribe).
// Works in every browser (Edge, Safari, Brave, mobile) because the
// browser records audio and we transcribe it server-side — no reliance
// on the flaky Web Speech API.
//
// Required Vercel env var:  ELEVENLABS_API_KEY
// Body: { audio: <base64>, mime: "audio/webm" }
// =============================================================
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) { res.status(500).json({ error: 'ELEVENLABS_API_KEY is not set in Vercel env vars' }); return; }
  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body || '{}');
    const b64 = (body && body.audio) || '';
    const mime = (body && body.mime) || 'audio/webm';
    if (!b64) { res.status(400).json({ error: 'audio required' }); return; }

    const buf = Buffer.from(b64, 'base64');
    const ext = mime.indexOf('mp4') !== -1 ? 'mp4' : (mime.indexOf('ogg') !== -1 ? 'ogg' : 'webm');
    const form = new FormData();
    form.append('file', new Blob([buf], { type: mime }), 'speech.' + ext);
    form.append('model_id', 'scribe_v1');

    const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': key },   // do NOT set content-type; FormData sets the boundary
      body: form,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      res.status(r.status).json({ error: (data && (data.detail && data.detail.message || data.message)) || 'STT error' });
      return;
    }
    res.status(200).json({ text: String(data.text || '').trim() });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
