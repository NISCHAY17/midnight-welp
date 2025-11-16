# midnight-welp
Minimal Slack bot scaffold (unofficial) — simplified for local testing.

Setup & run

1. Copy `.env.example` to `.env` and fill your Slack credentials:

```bash
cp .env.example .env
# edit .env and paste your Bot Token and Signing Secret
```

2. Install dependencies and start:

```bash
npm install
npm start
```

3. (Optional) Expose your local server with ngrok and set the Slack App Event Request URL to `https://<ngrok-id>.ngrok.io/slack/events`.

What changed

- The app was simplified to remove classifier/LLM logic and will now echo incoming messages with a short unofficial disclaimer. This makes it easier to get the bot running and test Slack connectivity.

If you want, I can next walk you through creating a Slack app, obtaining tokens, and wiring it to this project.
