// Vercel Serverless Function: принимает заявку с сайта и отправляет её в Telegram.
// Токен бота хранится только в переменных окружения Vercel и не попадает в браузер.

const hits = new Map(); // простой лимит запросов в пределах одного инстанса
const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;

function tooMany(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 500) hits.clear();
  return list.length > LIMIT;
}

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // Скрытое поле-ловушка для ботов: притворяемся, что всё хорошо
  if (body.site) return res.status(200).json({ ok: true });

  const name = String(body.name || '').trim().slice(0, 80);
  const phone = String(body.phone || '').trim().slice(0, 30);
  const digits = phone.replace(/\D/g, '');
  if (!name || digits.length < 10 || digits.length > 15) {
    return res.status(400).json({ ok: false, error: 'invalid_data' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (tooMany(ip)) {
    return res.status(429).json({ ok: false, error: 'too_many_requests' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chats = (process.env.TELEGRAM_CHAT_ID || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  if (!token || !chats.length) {
    console.error('Не заданы TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID');
    return res.status(500).json({ ok: false, error: 'not_configured' });
  }

  const when = new Date().toLocaleString('ru-RU', {
    timeZone: process.env.TZ_NAME || 'Europe/Moscow',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const text =
    '🏋️ <b>Новая заявка SportGym</b>\n\n' +
    `<b>Имя:</b> ${esc(name)}\n` +
    `<b>Телефон:</b> ${esc(phone)}\n` +
    `<b>Время:</b> ${when}`;

  try {
    const results = await Promise.all(
      chats.map(async (chat_id) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        try {
          const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true }),
            signal: ctrl.signal,
          });
          if (!r.ok) console.error('Telegram error', chat_id, r.status, await r.text());
          return r.ok;
        } finally {
          clearTimeout(timer);
        }
      })
    );
    if (!results.some(Boolean)) {
      return res.status(502).json({ ok: false, error: 'telegram_failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Lead send failed', e && e.message);
    return res.status(502).json({ ok: false, error: 'telegram_failed' });
  }
};
