<a href="https://hackclub.com/"><img style="position: absolute; top: 0; left: 10px; border: 0; width: 256px; z-index: 999;" src="https://assets.hackclub.com/flag-orpheus-top.svg" alt="Hack Club"/></a>

# Midnight Welp 🌙

> **Note:** This bot was originally built to answer questions for [**Hack Club Midnight**](https://midnight.hackclub.com/), an in-person murder mystery hackathon in Vienna by [Hack Club](https://hackclub.com/). This repository serves as a submission for a Hack Club event.

## Overview

Midnight Welp is a serverless Slack bot designed to handle complex AI queries without hitting the dreaded 3-second timeout limit of Slack's Events API on serverless platforms like Vercel.

Instead of processing the AI response immediately (which takes too long), the bot replies with a **"Generate Answer" button**. This button opens a web page that runs the AI logic client-side (or via a separate API call) and then updates the original Slack message with the answer.

![Screenshot 1](repo%20stuff/Screenshot%202025-11-23%20151956.png)
![Screenshot 2](repo%20stuff/Screenshot%202025-11-23%20151843.png)

## 🚀 Highly Customizable

While this was built for Midnight, it is designed to be a generic **"Knowledge Base Bot"** for any community. You can adapt it for your own hackathon, club, or discord server (with Slack adapter) easily.

### 1. Change the "Brain" 🧠
The bot's entire knowledge comes from a single text file.
*   **File:** `api/context.txt`
*   **How to customize:** Simply replace the text in this file with your own FAQ, rules, or documentation. The AI will strictly adhere to this context.
*   *Example:* Replace the Midnight FAQ with your school's club schedule or your project's documentation.

### 2. Customize the Persona 🤖
You can tweak how the bot behaves, its tone, and its rules.
*   **File:** `api/process-ai.js` (and `api/slack.js`)
*   **How to customize:** The code reads `api/context.txt` and feeds it to the AI. You can modify the code to prepend instructions like "Talk like a pirate" or "Be extremely concise".

### 3. The "Green Button" Flow 🟢
The interaction model (Button -> Web -> Slack) is fully customizable.
*   **Landing Page:** `public/index.html` - The page users see if they visit the root URL.
*   **Response Page:** `public/response.html` - The page that triggers the AI generation. You can style this to match your brand with custom CSS and images.

## Setup

1.  **Environment Variables:**
    *   `SLACK_BOT_TOKEN`: Your Slack Bot User OAuth Token.
    *   `SLACK_SIGNING_SECRET`: Your Slack App Signing Secret.
    *   `GEMINI_API_KEY`: Your Google Gemini API Key.

2.  **Deploy to Vercel:**
    *   This project is optimized for Vercel Serverless Functions.
    *   Simply import the repo into Vercel and set the environment variables.

3.  **Slack Configuration:**
    *   Create a Slack App.
    *   Enable **Interactivity** and set the Request URL to `https://your-app.vercel.app/api/slack`.
    *   Enable **Event Subscriptions** for `app_mention` and set the Request URL to `https://your-app.vercel.app/api/slack`.
    *   Add `chat:write` and `app_mentions:read` scopes.

## Tech Stack
*   **Node.js** (Vercel Functions)
*   **@slack/bolt** (Slack Framework)
*   **Google Gemini** (AI Model)
*   **HTML/JS** (Frontend for processing)
