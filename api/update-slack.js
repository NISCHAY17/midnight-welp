const { WebClient } = require('@slack/web-api');
const crypto = require('crypto');

const BOT_TOKEN = process.env.BOT_TOKEN;
const SIGNING_SECRET = process.env.SIGNING_SECRET;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { channel, ts, text, prompt, sig } = req.body;

  if (!channel || !ts || !text || !prompt || !sig) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  // Verify signature
  const expectedSig = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(prompt + channel + ts)
    .digest('hex');

  if (sig !== expectedSig) {
    res.status(403).json({ error: 'Invalid signature' });
    return;
  }

  try {
    const client = new WebClient(BOT_TOKEN);
    await client.chat.update({
      channel,
      ts,
      text: `🤖 ${text}`
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating Slack:', error);
    res.status(500).json({ error: 'Failed to update Slack', details: error.message });
  }
};
