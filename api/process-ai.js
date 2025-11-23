const { WebClient } = require('@slack/web-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.BOT_TOKEN;
const SIGNING_SECRET = process.env.SIGNING_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Helper function to call Gemini
async function askAI(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  
  try {
    console.log('Calling Gemini with model: gemini-2.5-flash');
    
    // Read context file
    const contextPath = path.join(__dirname, 'context.txt');
    let systemInstruction = '';
    try {
        systemInstruction = fs.readFileSync(contextPath, 'utf8');
    } catch (e) {
        console.error('Failed to read context.txt:', e);
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        systemInstruction: systemInstruction
    });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('AI error:', error);
    throw error;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { channel, ts, prompt, sig } = req.body;

  if (!channel || !ts || !prompt || !sig) {
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

  console.log(`Processing AI request for channel ${channel} ts ${ts}`);

  // Send immediate response
  
  try {
    const client = new WebClient(BOT_TOKEN);

    // Signal that we picked it up
    const APP_URL = 'https://midnight-welp.vercel.app';
    const liveLink = `${APP_URL}/response.html?prompt=${encodeURIComponent(prompt)}&channel=${channel}&ts=${ts}&sig=${sig}`;
    
    // Immediate update to confirm background process started
    await client.chat.update({
        channel,
        ts,
        text: `⏳ *Starting AI Engine...*\n<${liveLink}|View Live Response>`
    });

    // Start progress updates
    let startTime = Date.now();
    const logs = [
        "Connecting to Gemini...",
        "Authenticating...",
        "Sending prompt...",
        "Analyzing context...",
        "Generating response...",
        "Formatting output..."
    ];
    
    const updateInterval = setInterval(async () => {
        try {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const logIndex = Math.min(Math.floor(elapsed / 1.5), logs.length - 1);
            const currentLog = logs[logIndex];
            const progressBar = "█".repeat(Math.min(elapsed, 10)) + "░".repeat(Math.max(0, 10 - elapsed));
            
            await client.chat.update({
                channel,
                ts,
                text: `⏳ *${currentLog}*\n\`[${progressBar}] ${elapsed}s\`\n<${liveLink}|View Live Response>`
            });
        } catch (e) {
            console.log('Progress update failed (likely rate limit):', e.message);
        }
    }, 2000);

    try {
        const aiText = await askAI(prompt);
        clearInterval(updateInterval);

        await client.chat.update({
            channel,
            ts,
            text: `🤖 ${aiText}`
        });
    } catch (aiError) {
        clearInterval(updateInterval);
        throw aiError;
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in process-ai:', error);
    
    try {
      const client = new WebClient(BOT_TOKEN);
      const APP_URL = 'https://midnight-welp.vercel.app';
      const liveLink = `${APP_URL}/response.html?prompt=${encodeURIComponent(prompt)}&channel=${channel}&ts=${ts}&sig=${sig}`;
      
      let errorText = `❌ Error: ${error.message}`;
      if (error.message.includes('timed out')) {
         errorText = `⚠️ Response taking too long.\n<${liveLink}|👉 Click here to view the answer>`;
      } else {
         errorText += `\nTry the live link: <${liveLink}|View Live Response>`;
      }

      await client.chat.update({
        channel,
        ts,
        text: errorText
      });
    } catch (slackError) {
      console.error('Failed to report error to Slack:', slackError);
    }

    res.status(500).json({ error: 'Failed to process AI', details: error.message });
  }
};
