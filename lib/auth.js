// Sessão (token assinado, 12 h) e senhas (scrypt com sal individual).
const crypto = require('crypto');

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('SESSION_SECRET não configurado');
  return s;
};
const hmac = (p) => crypto.createHmac('sha256', secret()).update(p).digest('base64url');

// payload: { role: 'master' | 'editor', u: login, n: nome }
exports.sign = (payload, ttlMs = 12 * 3600 * 1000) => {
  const p = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlMs })).toString('base64url');
  return p + '.' + hmac(p);
};

// Devolve o conteúdo do token se for válido e não vencido; senão, null.
exports.verify = (tok) => {
  try {
    const [p, m] = String(tok || '').split('.');
    if (!p || !m) return null;
    const a = Buffer.from(m), b = Buffer.from(hmac(p));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const pl = JSON.parse(Buffer.from(p, 'base64url').toString());
    return pl.exp > Date.now() ? pl : null;
  } catch (e) {
    return null;
  }
};

exports.safeEq = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};

const scrypt = (senha, salt) =>
  new Promise((ok, no) => crypto.scrypt(String(senha), Buffer.from(salt, 'hex'), 32, (e, k) => (e ? no(e) : ok(k))));

exports.hashPw = async (senha) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: (await scrypt(senha, salt)).toString('hex') };
};

exports.checkPw = async (senha, salt, hash) => {
  const a = await scrypt(senha, salt), b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
