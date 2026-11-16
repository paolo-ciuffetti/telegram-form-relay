# Telegram Form Relay

A lightweight, serverless API endpoint designed for Vercel that forwards HTML web form submissions directly to a Telegram chat, protected by CORS restrictions and optional global rate limiting via Upstash Redis.

## Features

- **Zero Backend Maintenance**: Ready to deploy as a Vercel Serverless Function.
- **Optional Spam Protection**: Built-in global rate limiting powered by Upstash Redis (automatically disabled if Redis credentials are not provided).
- **CORS Security**: Restricts requests strictly to your production domain (with automatic `localhost` support in development).
- **Safe Formatting**: Escapes user input using HTML parse mode to prevent Telegram API formatting errors.

## Step-by-Step Deployment Guide

### Step 1: Fork or Clone the Repository

1. Fork this repository to your GitHub account (or clone it and push it to a new repository):
   ```bash
   git clone [https://github.com/yourusername/telegram-form-relay.git](https://github.com/yourusername/telegram-form-relay.git)
   cd telegram-form-relay
   ```

### Step 2: Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow the instructions to get your `TELEGRAM_BOT_TOKEN`.
3. Get your target `TELEGRAM_CHAT_ID` (you can use bots like `@userinfobot` or add your bot to a private channel/group and fetch the ID via the Telegram API).

### Step 3: Set Up Upstash Redis *(Optional - For Rate Limiting)*

If you want to enable global rate limiting to protect your form against spam:
1. Go to the [Upstash Console](https://console.upstash.com/) and log in with GitHub.
2. Click **Create Database**, choose a name, select the region closest to your users, and click **Create**.
3. On the database details page, scroll down to the **REST API** section and copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

*(If you skip this step, the relay will still work normally without rate limiting).*

### Step 4: Deploy on Vercel

1. Go to the [Vercel Dashboard](https://vercel.com/) and log in with GitHub.
2. Click **Add New... -> Project** and import your `telegram-form-relay` repository.
3. In the **Configure Project** screen, leave the build settings as default (Vercel automatically detects the serverless function inside `/api`).
4. Expand the **Environment Variables** section and add:
   - `ALLOWED_ORIGIN`: Your frontend domain URL (e.g., `https://yourdomain.com`).
   - `TELEGRAM_BOT_TOKEN`: Your bot token from BotFather.
   - `TELEGRAM_CHAT_ID`: Your target chat or channel ID.
   - `UPSTASH_REDIS_REST_URL` *(Optional)*: The REST URL copied from Upstash.
   - `UPSTASH_REDIS_REST_TOKEN` *(Optional)*: The REST Token copied from Upstash.
   - `RATE_LIMIT_MAX` *(Optional)*: Max submissions per minute across the form (defaults to `6`, requires Upstash).
5. Click **Deploy**.

Once deployed, Vercel will provide your live endpoint URL:
`https://your-project.vercel.app/api/send-notification`

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```
3. Run the Vercel development server:
   ```bash
   npm run dev
   ```
   *(Note: In development mode, requests from `http://localhost` and `http://127.0.0.1` are automatically allowed by CORS).*

## Frontend Usage Example

See [examples/index.html](examples/index.html) for a complete, ready-to-use HTML/JS contact form, or integrate the `fetch` call directly into your existing frontend:

```javascript
async function submitForm(formData) {
  const response = await fetch('[https://your-project.vercel.app/api/send-notification](https://your-project.vercel.app/api/send-notification)', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: formData.name,
      email: formData.email,
      message: formData.message,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Something went wrong');
  }
  return result;
}
```

## License

This project is licensed under the **GNU General Public License v3.0** - see the [LICENSE](LICENSE) file for details.
