// Acesso ao banco (Upstash Redis via REST). As variáveis são criadas pelo Vercel ao conectar o banco.
// Aceita os nomes padrão e também com prefixo (ex.: STORAGE_KV_REST_API_URL), que o Vercel cria
// quando se escolhe um prefixo ao conectar o banco.
const achar = (...fins) => {
  const e = process.env;
  for (const f of fins) if (e[f]) return e[f];
  const k = Object.keys(e).find((n) => fins.some((f) => n.endsWith('_' + f)) && e[n]);
  return k ? e[k] : undefined;
};
const url = () => achar('KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL');
const token = () => achar('KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN');

async function cmd(args) {
  const u = url(), t = token();
  if (!u || !t) throw new Error('Banco de dados não configurado');
  const r = await fetch(u, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || 'Erro no banco (' + r.status + ')');
  return j.result;
}

exports.getCfg = async () => {
  const s = await cmd(['GET', 'guia:config']);
  return s ? JSON.parse(s) : null;
};
exports.setCfg = (cfg) => cmd(['SET', 'guia:config', JSON.stringify(cfg)]);

// ---- Usuários (hash "guia:users": campo = login, valor = JSON) ----
const parse = (s) => { try { return JSON.parse(s); } catch (e) { return null; } };

exports.getUser = async (login) => {
  const s = await cmd(['HGET', 'guia:users', login]);
  return s ? parse(s) : null;
};
exports.getUsers = async () => {
  const r = await cmd(['HGETALL', 'guia:users']);
  const vals = Array.isArray(r) ? r.filter((_, i) => i % 2 === 1) : Object.values(r || {});
  return vals.map(parse).filter(Boolean);
};
// Cria só se o login ainda não existir (atômico). Devolve true se criou.
exports.createUser = async (login, u) => (await cmd(['HSETNX', 'guia:users', login, JSON.stringify(u)])) === 1;
exports.saveUser = (login, u) => cmd(['HSET', 'guia:users', login, JSON.stringify(u)]);
exports.deleteUser = (login) => cmd(['HDEL', 'guia:users', login]);
exports.cmd = cmd;
