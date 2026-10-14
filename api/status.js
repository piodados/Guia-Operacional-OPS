// Diagnóstico: mostra só SE cada variável existe (nunca os valores).
const { cmd } = require('../lib/store');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const e = process.env;
  const r = {
    ADMIN_USER: !!e.ADMIN_USER,
    ADMIN_PASSWORD: !!e.ADMIN_PASSWORD,
    SESSION_SECRET: !!e.SESSION_SECRET && e.SESSION_SECRET.length >= 16,
    BANCO_VARIAVEIS: Object.keys(e).filter((n) => /KV_REST_API|UPSTASH_REDIS_REST|^KV_URL|REDIS/i.test(n)),
    ADMIN_USER_TAMANHO: (e.ADMIN_USER || '').length,
    ADMIN_PASSWORD_TAMANHO: (e.ADMIN_PASSWORD || '').length,
    ADMIN_COM_ESPACO_OU_ASPAS: /^\s|\s$|^["']|["']$/.test((e.ADMIN_USER || '') + '|' + (e.ADMIN_PASSWORD || '')) || /^\s|\s$|^["']|["']$/.test(e.ADMIN_USER || '') || /^\s|\s$|^["']|["']$/.test(e.ADMIN_PASSWORD || ''),
    ADMIN_CARACTERES_ESTRANHOS: /[^\x21-\x7E]/.test((e.ADMIN_USER || '').trim() + (e.ADMIN_PASSWORD || '').trim()),
    NOTIFY_EMAIL: !!e.NOTIFY_EMAIL,
    RESEND_API_KEY: !!e.RESEND_API_KEY,
  };
  try { await cmd(['PING']); r.BANCO_RESPONDE = true; } catch (x) { r.BANCO_RESPONDE = false; r.BANCO_ERRO = String(x.message).slice(0, 120); }
  res.status(200).json(r);
};
