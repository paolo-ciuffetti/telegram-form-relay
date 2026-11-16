import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// Initialize Redis client only if both credentials are provided
const redis = redisUrl && redisToken
  ? new Redis({ url: redisUrl, token: redisToken })
  : null;

// Helper to prevent HTML injection in Telegram messages
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  const requestOrigin = req.headers.origin;
  const isDev = process.env.NODE_ENV !== 'production';

  let originToSet = '';
  if (allowedOrigin && requestOrigin === allowedOrigin) {
    originToSet = allowedOrigin;
  } else if (
    isDev &&
    requestOrigin &&
    (requestOrigin.startsWith('http://localhost') || requestOrigin.startsWith('http://127.0.0.1'))
  ) {
    originToSet = requestOrigin;
  }

  if (originToSet) {
    res.setHeader('Access-Control-Allow-Origin', originToSet);
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, message } = req.body || {};

    if (!message || String(message).trim() === '') {
      return res.status(400).json({ error: 'Message field is required.' });
    }

    // --- OPTIONAL GLOBAL RATE LIMITING ---
    if (redis) {
      const rateLimitKey = 'global_form_rate_limit';
      const maxRequestsPerMinute = parseInt(process.env.RATE_LIMIT_MAX || '6', 10);

      const currentRequests = await redis.incr(rateLimitKey);
      if (currentRequests === 1) {
        await redis.expire(rateLimitKey, 60);
      } else {
        const ttl = await redis.ttl(rateLimitKey);
        if (ttl === -1) await redis.expire(rateLimitKey, 60);
      }

      if (currentRequests > maxRequestsPerMinute) {
        return res.status(429).json({
          error: 'Rate limit exceeded. Please try again shortly.',
        });
      }
    }
    // -------------------------------------

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    const safeName = escapeHtml(name) || 'Not specified';
    const safeEmail = escapeHtml(email) || 'Not specified';
    const safeMessage = escapeHtml(message);

    const text =
      `📬 <b>New Web Form Submission</b>\n\n` +
      `👤 <b>Name:</b> ${safeName}\n` +
      `📧 <b>Email:</b> ${safeEmail}\n` +
      `💬 <b>Message:</b>\n${safeMessage}`;

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }),
    });

    const telegramData = await telegramResponse.json();

    if (telegramData.ok) {
      return res.status(200).json({ success: true, message: 'Message sent successfully!' });
    } else {
      console.error('Telegram API Error:', telegramData);
      return res.status(502).json({ error: 'Failed to forward message.' });
    }
  } catch (error) {
    console.error('Internal Server Error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
