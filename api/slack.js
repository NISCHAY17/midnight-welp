const { App } = require('@slack/bolt');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const BOT_TOKEN = process.env.BOT_TOKEN;
const SIGNING_SECRET = process.env.SIGNING_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!BOT_TOKEN || !SIGNING_SECRET) {
  throw new Error('BOT_TOKEN and SIGNING_SECRET env vars are required');
}

// Helper function to call Gemini
async function askAI(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('AI error:', error);
    throw error;
  }
}

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

app.message(async ({ message, say, client }) => {
  try {
    if (message.subtype && message.subtype === 'bot_message') return;
    if (message.subtype === 'message_changed') return;
    const text = (message.text || '').trim();
    if (!text) return;

    const info = { user: message.user, channel: message.channel, text, channel_type: message.channel_type };
    console.log('Incoming message:', info);
    recordEvent('message', info);

    const botWasMentioned = BOT_USER_ID && text.includes(`<@${BOT_USER_ID}>`);
    const asksForHelp = /help/i.test(text);

    // If bot was mentioned in a channel, let app_mention handler deal with it
    if (message.channel_type === 'channel' && botWasMentioned) {
      return;
    }

    if (message.channel_type === 'channel' && !asksForHelp) {
      return;
    }

    
    let cleanText = text;
    if (BOT_USER_ID) {
      cleanText = text.replace(new RegExp(`<@${BOT_USER_ID}>`, 'g'), '').trim();
    }

    // Check for /status command
    if (cleanText === '/status') {
      const aiConfigured = genAI ? '✅ Configured' : '❌ Not configured';
      const botIdStatus = BOT_USER_ID ? `✅ ${BOT_USER_ID}` : '❌ Unknown';
      const eventsCount = recentEvents.length;
      
      const statusMessage = `*Bot Status*
• Bot ID: ${botIdStatus}
• AI (Gemini): ${aiConfigured}
• Events recorded: ${eventsCount}
• Status: ✅ Online`;
      
      await say({ text: statusMessage });
      return;
    }

    // Check if message contains /ai command
    if (cleanText.startsWith('/ai ')) {
      const prompt = cleanText.substring(4).trim();
      
      if (!genAI) {
        await say({ text: '❌ AI not configured. Please set GEMINI_API_KEY.' });
        return;
      }

      if (!prompt) {
        await say({ text: '❌ Please provide a prompt. Example: `/ai What is Slack?`' });
        return;
      }

      try {
        // Send initial message
        const result = await say({ text: '⏳ Asking AI...' });
        const messageTs = result.ts;

        // Get AI response
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const aiResult = await model.generateContent(prompt);
        const aiResponse = await aiResult.response;
        const aiText = aiResponse.text();
        
        
        await client.chat.update({
          channel: message.channel,
          ts: messageTs,
          text: `🤖 ${aiText}`
        });
      } catch (aiErr) {
        console.error('AI error:', aiErr);
        await say({ text: '❌ AI error: ' + aiErr.message });
      }
      return;
    }

    await say({ text: `*(Unofficial)* Received: "${cleanText}"` });
  } catch (err) {
    console.error('Error handling message:', err);
  }
});

app.event('app_mention', async ({ event, say, client }) => {
  try {
    const text = (event.text || '').trim();
    const info = { user: event.user, channel: event.channel, text };
    console.log('App mention:', info);
    recordEvent('app_mention', info);

    
    let prompt = text;
    if (BOT_USER_ID) {
      prompt = text.replace(new RegExp(`<@${BOT_USER_ID}>`, 'g'), '').trim();
    }

    // Check for /status command
    if (prompt === '/status') {
      const aiConfigured = GEMINI_API_KEY ? '✅ Configured' : '❌ Not configured';
      const botIdStatus = BOT_USER_ID ? `✅ ${BOT_USER_ID}` : '❌ Unknown';
      const eventsCount = recentEvents.length;
      
      const statusMessage = `*Bot Status*
• Bot ID: ${botIdStatus}
• AI (Gemini): ${aiConfigured}
• Events recorded: ${eventsCount}
• Status: ✅ Online`;
      
      await say({ text: statusMessage });
      return;
    }

    if (!prompt) {
      await say({ text: '❌ Please ask me something!' });
      return;
    }

    if (!GEMINI_API_KEY) {
      await say({ text: '❌ AI not configured' });
      return;
    }

    try {
      // Send initial acknowledgment
      await say({ text: '⏳ Asking AI...' });

      // Get AI response (this might take a bit)
      const aiText = await askAI(prompt);
      
      // Send the actual response as a new message
      await say({ text: `🤖 ${aiText}` });
    } catch (aiErr) {
      console.error('AI error:', aiErr);
      await say({ text: '❌ Error: ' + aiErr.message });
    }
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