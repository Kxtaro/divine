// =============================================================
// Vercel serverless proxy → Anthropic (Claude) Messages API.
// The API key lives ONLY in the Vercel env var ANTHROPIC_API_KEY,
// never in the repo or the browser. The browser calls this same-
// origin endpoint, which sidesteps Anthropic's browser CORS block.
//
// Required Vercel env var:  ANTHROPIC_API_KEY
// Optional:                 DIVINE_MODEL  (defaults below)
// =============================================================
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set in Vercel env vars' }); return; }
  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body || '{}');
    const { system, messages } = body || {};
    if (!Array.isArray(messages) || !messages.length) { res.status(400).json({ error: 'messages[] required' }); return; }
    // If "claude-opus-4-5" 404s on your account, set DIVINE_MODEL to a
    // current id (e.g. claude-opus-4-8) in Vercel — no code change needed.
    const model = process.env.DIVINE_MODEL || 'claude-opus-4-5';

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens: 400, system: system || '', messages }),
    });
    const data = await r.json();
    if (!r.ok) {
      res.status(r.status).json({ error: (data && data.error && data.error.message) || 'Claude API error' });
      return;
    }
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
