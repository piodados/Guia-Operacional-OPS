const { getCfg, setCfg, getUser } = require('../lib/store');
const { verify } = require('../lib/auth');

const NIVEIS = ['zig'];

// Aceita só o formato esperado e descarta o resto.
function limpar(b) {
  const off = {};
  if (b && b.off && typeof b.off === 'object') {
    let n = 0;
    for (const k of Object.keys(b.off)) {
      if (/^b\d{1,2}(p\d{1,2}(c\d{1,3})?)?$/.test(k) && b.off[k] === true && ++n <= 1000) off[k] = true;
    }
  }
  const sup = {};
  if (b && b.sup && typeof b.sup === 'object') {
    for (const k of NIVEIS) {
      const c = b.sup[k];
      if (c && typeof c === 'object') {
        const nome = String(c.nome || '').slice(0, 80);
        const tel = String(c.tel || '').slice(0, 300);
        if (nome || tel) sup[k] = { nome, tel };
        else if (c.vazio === true) sup[k] = { nome: '', tel: '', vazio: true };
      }
    }
  }
  // Ordem dos blocos: lista de índices sem repetição
  const ord = [];
  if (b && Array.isArray(b.ord)) {
    for (const v of b.ord) if (Number.isInteger(v) && v >= 0 && v < 100 && !ord.includes(v) && ord.length < 100) ord.push(v);
  }
  // Textos editados: id → lista de até 4 campos de texto
  const tx = {};
  if (b && b.tx && typeof b.tx === 'object') {
    let n = 0;
    for (const k of Object.keys(b.tx)) {
      const v = b.tx[k];
      if (/^b\d{1,2}(p\d{1,2}(c\d{1,3})?)?$/.test(k) && Array.isArray(v) && v.length >= 1 && v.length <= 4 && ++n <= 1500) {
        tx[k] = v.map((t) => String(t == null ? '' : t).slice(0, 4000));
      }
    }
  }
  return { off, sup, ord, tx };
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const c = await getCfg();
      res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
      return res.status(200).json(c ? { exists: true, off: c.off || {}, sup: c.sup || {}, ord: c.ord || [], tx: c.tx || {} } : { exists: false });
    }
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'POST') {
      const h = req.headers.authorization || '';
      const pl = verify(h.startsWith('Bearer ') ? h.slice(7) : '');
      if (!pl || (pl.role !== 'master' && pl.role !== 'editor')) return res.status(401).json({ erro: 'Sessão expirada. Entre novamente como administrador.' });
      if (pl.role !== 'master') {
        // Usuário cadastrado: só edita enquanto o acesso continuar ativo.
        const u = await getUser(pl.u);
        if (!u || u.status !== 'ativo') return res.status(401).json({ erro: 'Seu acesso foi removido pelo administrador.' });
      }
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      await setCfg({ ...limpar(body), at: new Date().toISOString() });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ erro: 'Método não permitido' });
  } catch (e) {
    return res.status(500).json({ erro: require('../lib/erro')(e) });
  }
};
