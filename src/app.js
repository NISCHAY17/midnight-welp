const { App } = require('@slack/bolt');
const dotenv = require('dotenv');

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const SIGNING_SECRET = process.env.SIGNING_SECRET;
const PORT = process.env.PORT || 3000;

if (!BOT_TOKEN || !SIGNING_SECRET) {
  console.error('Missing BOT_TOKEN or SIGNING_SECRET in environment. Create a .env with BOT_TOKEN and SIGNING_SECRET');
  process.exit(1);
}

const app = new App({
  token: BOT_TOKEN,
  signingSecret: SIGNING_SECRET,
});

// Track bot user id so we can detect mentions
let BOT_USER_ID = null;

app.message(async ({ message, say, context }) => {
  try {
    if (message.subtype && message.subtype === 'bot_message') return;
    const text = (message.text || '').trim();
    if (!text) return;

    console.log('Incoming message:', {
      user: message.user,
      channel: message.channel,
      text,
      channel_type: message.channel_type,
    });

    const botWasMentioned = BOT_USER_ID && text.includes(`<@${BOT_USER_ID}>`);
    const asksForHelp = /help/i.test(text);

    if (message.channel_type === 'channel' && !botWasMentioned && !asksForHelp) {
      return;
    }

    await say({ text: `*(Unofficial)* Received your message: "${text}"` });
  } catch (err) {
    console.error('Error handling message:', err);
  }
});

app.event('app_mention', async ({ event, say }) => {
  try {
    const text = (event.text || '').trim();
    console.log('App mention:', { user: event.user, channel: event.channel, text });
    await say({ text: `*(Unofficial)* Hi <@${event.user}> — I saw: "${text}"` });
  } catch (err) {
    console.error('Error handling app_mention:', err);
  }
});

app.event('message', async ({ event, context }) => {
  try {
    // Always log the raw event so you can see what Slack sends
    console.log('RAW message event:', JSON.stringify(event, null, 2));
  } catch (err) {
    console.error('Error logging raw message event:', err);
  }
});
// --- end added ---

// --- added: global error handler for Bolt ---
app.error(async (error) => {
  console.error('Bolt app error:', error);
});

(async () => {
  // fetch bot user id so we can detect mentions in messages
  try {
    const auth = await app.client.auth.test({ token: BOT_TOKEN });
    BOT_USER_ID = auth.user_id;
    console.log('Bot user id:', BOT_USER_ID);
  } catch (err) {
    console.warn('Could not fetch bot user id:', err && err.data ? err.data : err);
  }

  await app.start(PORT);
  console.log(`⚡️ Midnight-welp bot running on port ${PORT}`);
})();
