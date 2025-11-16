const { App, ExpressReceiver } = require('@slack/bolt');

const BOT_TOKEN = process.env.BOT_TOKEN;
const SIGNING_SECRET = process.env.SIGNING_SECRET;

if (!BOT_TOKEN || !SIGNING_SECRET) {
  throw new Error('BOT_TOKEN and SIGNING_SECRET env vars are required');
}

// Express receiver works on Vercel (serverless)
const receiver = new ExpressReceiver({
  signingSecret: SIGNING_SECRET,
  processBeforeResponse: true,
});

const app = new App({
  token: BOT_TOKEN,
  receiver,
  processBeforeResponse: true,
});

let BOT_USER_ID = null;
const recentEvents = [];
const MAX_EVENTS = 50;

function recordEvent(type, payload) {
  recentEvents.unshift({
    timestamp: new Date().toISOString(),
    type,
    payload,
  });
  if (recentEvents.length > MAX_EVENTS) {
    recentEvents.pop();
  }
}

app.message(async ({ message, say }) => {
  try {
    if (message.subtype && message.subtype === 'bot_message') return;
    const text = (message.text || '').trim();
    if (!text) return;

    const info = { user: message.user, channel: message.channel, text, channel_type: message.channel_type };
    console.log('Incoming message:', info);
    recordEvent('message', info);

    const botWasMentioned = BOT_USER_ID && text.includes(`<@${BOT_USER_ID}>`);
    const asksForHelp = /help/i.test(text);

    if (message.channel_type === 'channel' && !botWasMentioned && !asksForHelp) {
      return;
    }

    await say({ text: `*(Unofficial)* Received: "${text}"` });
  } catch (err) {
    console.error('Error handling message:', err);
  }
});

app.event('app_mention', async ({ event, say }) => {
  try {
    const text = (event.text || '').trim();
    const info = { user: event.user, channel: event.channel, text };
    console.log('App mention:', info);
    recordEvent('app_mention', info);
    await say({ text: `*(Unofficial)* Hi <@${event.user}> — I saw: "${text}"` });
  } catch (err) {
    console.error('Error handling app_mention:', err);
  }
});

app.event('message', async ({ event }) => {
  try {
    recordEvent('raw_message', event);
  } catch (err) {
    console.error('Error recording raw message event:', err);
  }
});

app.error(async (error) => {
  console.error('Bolt app error:', error);
});

(async () => {
  try {
    const auth = await app.client.auth.test({ token: BOT_TOKEN });
    BOT_USER_ID = auth.user_id;
    console.log('Bot user id:', BOT_USER_ID);
  } catch (err) {
    console.warn('Could not fetch bot user id:', err);
  }
})();

// Export the ExpressReceiver's app to Vercel
receiver.router.get('/debug/events', (req, res) => {
  const rows = recentEvents
    .map((entry) => {
      const payload = JSON.stringify(entry.payload, null, 2)
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<tr><td>${entry.timestamp}</td><td>${entry.type}</td><td><pre>${payload}</pre></td></tr>`;
    })
    .join('');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>midnight-welp debug events</title>
  <style>
    body { font-family: sans-serif; margin: 1.5rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 0.5rem; vertical-align: top; }
    pre { margin: 0; font-size: 0.85rem; }
    caption { font-weight: bold; margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <table>
    <caption>Recent Slack events (latest first)</caption>
    <thead>
      <tr><th>Timestamp (UTC)</th><th>Type</th><th>Payload</th></tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="3">No events recorded yet.</td></tr>'}</tbody>
  </table>
</body>
</html>`);
});

receiver.router.get('/debug/events.json', (req, res) => {
  res.json({ events: recentEvents });
});

module.exports = receiver.app;