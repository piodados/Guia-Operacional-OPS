// Gestão de usuários: só o administrador principal.
const { verify } = require('../lib/auth');
const { getUsers, getUser, saveUser, deleteUser } = require('../lib/store');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const h = req.headers.authorization || '';
    const pl = verify(h.startsWith('Bearer ') ? h.slice(7) : '');
    if (!pl) return res.status(401).json({ erro: 'Sessão expirada. Entre novamente.' });
    if (pl.role !== 'master') return res.status(403).json({ erro: 'Apenas o administrador principal pode fazer isso.' });

    if (req.method === 'GET') {
      const users = (await getUsers())
        .map((u) => ({ login: u.login, nome: u.nome, status: u.status, criadoEm: u.criadoEm }))
        .sort((a, b) => String(a.criadoEm).localeCompare(String(b.criadoEm)));
      return res.status(200).json({ users });
    }
    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const login = String(b.login || '').trim().toLowerCase();
      const u = login ? await getUser(login) : null;
      if (!u) return res.status(404).json({ erro: 'Usuário não encontrado.' });
      if (b.acao === 'aprovar') {
        await saveUser(login, { ...u, status: 'ativo', aprovadoEm: new Date().toISOString() });
      } else if (b.acao === 'recusar' || b.acao === 'remover') {
        await deleteUser(login);
      } else {
        return res.status(400).json({ erro: 'Ação inválida.' });
      }
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ erro: 'Método não permitido' });
  } catch (e) {
    return res.status(500).json({ erro: require('../lib/erro')(e) });
  }
};
