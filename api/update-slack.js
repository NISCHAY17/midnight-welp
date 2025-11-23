const { WebClient } = require('@slack/web-api');
const crypto = require('crypto');

const BOT_TOKEN = process.env.BOT_TOKEN;
const SIGNING_SECRET = process.env.SIGNING_SECRET;
const APP_URL = 'https://midnight-welp.vercel.app';

function convertMarkdownToSlack(text) {
  // Bold: **text** -> *text*
  let slackText = text.replace(/\*\*(.*?)\*\*/g, '*$1*');
  
  slackText = slackText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>');
  
  // Headers: # Header -> *Header*
  slackText = slackText.replace(/^#{1,6}\s+(.*)$/gm, '*$1*');
  
  
  return slackText;
}

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

  const liveLink = `${APP_URL}/response.html?prompt=${encodeURIComponent(prompt)}&channel=${channel}&ts=${ts}&sig=${sig}`;

  // Convert Markdown to Slack format
  const formattedText = convertMarkdownToSlack(text);

  try {
    const client = new WebClient(BOT_TOKEN);

    // We show it for the "Click received" message, but remove it for the final answer
    const isIntermediate = text.includes("Click received");
    
    let blocks = [];
    
    if (isIntermediate) {
        blocks = [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": formattedText
            }
          },
          {
            "type": "actions",
            "elements": [
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "View Live Status 🚀",
                  "emoji": true
                },
                "style": "primary",
                "url": liveLink
              }
            ]
          }
        ];
    }

    try {
        // Attempt to update
        await client.chat.update({
            channel,
            ts,
            text: formattedText,
            blocks: blocks
        });
    } catch (slackError) {
        // Handle message too long errors
        if (slackError.data && (slackError.data.error === 'msg_too_long' || slackError.data.error === 'invalid_blocks')) {
             console.log('Message too long, falling back to summary');
             
             await client.chat.update({
                channel,
                ts,
                text: "Response too long to display.",
                blocks: [
                    {
                      "type": "section",
                      "text": {
                        "type": "mrkdwn",
                        "text": "⚠️ *Response too long for Slack*\n\nThe AI response is ready but is too large to display here completely. Please view it on the website."
                      }
                    },
                    {
                      "type": "actions",
                      "elements": [
                        {
                          "type": "button",
                          "text": {
                            "type": "plain_text",
                            "text": "View Full Response on Web 🚀",
                            "emoji": true
                          },
                          "style": "primary",
                          "url": liveLink
                        }
                      ]
                    }
                ]
             });
        } else {
            throw slackError;
        }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating Slack:', error);
    res.status(500).json({ error: 'Failed to update Slack', details: error.message });
  }
};
