const { App } = require('@slack/bolt');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const BOT_TOKEN = process.env.BOT_TOKEN;
const SIGNING_SECRET = process.env.SIGNING_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!BOT_TOKEN || !SIGNING_SECRET) {
  throw new Error('BOT_TOKEN and SIGNING_SECRET env vars are required');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

const app = new App({
  token: BOT_TOKEN,
  signingSecret: SIGNING_SECRET,
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


    if (text.startsWith('/ai ')) {
      const prompt = text.substring(4).trim();
      
      if (!genAI) {
        await say({ text: '❌ AI not configured. Please set GEMINI_API_KEY.' });
        return;
      }

      if (!prompt) {
        await say({ text: '❌ Please provide a prompt. Example: `/ai What is Slack?`' });
        return;
      }

      try {
        await say({ text: '🤔 Thinking...' });
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiText = response.text();
        
        await say({ text: `🤖 ${aiText}` });
      } catch (aiErr) {
        console.error('AI error:', aiErr);
        await say({ text: '❌ AI error: ' + aiErr.message });
      }
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

module.exports = async (req, res) => {
  console.log('Request:', req.method, req.url);
  
  const url = req.url || '';
  const pathname = url.split('?')[0];
  
  // Root status page
  if (req.method === 'GET' && pathname === '/api/slack') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>midnight-welp bot</title>
  <style>
    body { font-family: sans-serif; margin: 2rem; max-width: 600px; }
    h1 { margin-bottom: 1rem; }
    .ok { color: green; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    td { padding: 0.5rem; border-bottom: 1px solid #ddd; }
    td:first-child { font-weight: bold; width: 150px; }
    a { display: block; margin: 0.5rem 0; }
  </style>
</head>
<body>
  <h1>midnight-welp</h1>
  <p class="ok">Status: OK</p>
  <table>
    <tr><td>Bot ID</td><td>${BOT_USER_ID || 'unknown'}</td></tr>
    <tr><td>Events</td><td>${recentEvents.length}</td></tr>
    <tr><td>Last event</td><td>${recentEvents[0]?.timestamp || 'none'}</td></tr>
  </table>
  <a href="/api/events">View recent events</a>
  <a href="/api/events.json">JSON data</a>
</body>
</html>`);
    return;
  }

  // Handle Slack events
  const slackEvent = req.body;

  if (slackEvent && slackEvent.type === 'url_verification') {
    res.status(200).send(slackEvent.challenge);
    return;
  }

  // Process Slack event through Bolt
  try {
    await app.processEvent({
      body: slackEvent,
      ack: async (response) => {
        res.status(200).send(response || '');
      },
    });
  } catch (error) {
    console.error('Error processing event:', error);
    res.status(500).send('Internal server error');
  }
};