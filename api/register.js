const { hashPw } = require('../lib/auth');
const { getUsers, createUser } = require('../lib/store');
const { avisarCadastro } = require('../lib/notify');

const LOGIN = /^[a-z0-9._-]{3,30}$/;
const MAX_PENDENTES = 30;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const login = String(b.login || '').trim().toLowerCase();
    const nome = String(b.nome || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const senha = String(b.senha || '');
    if (nome.length < 2) return res.status(400).json({ erro: 'Informe o seu nome.' });
    if (!LOGIN.test(login)) return res.status(400).json({ erro: 'Login inválido. Use de 3 a 30 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.' });
    if (senha.length < 8 || senha.length > 100) return res.status(400).json({ erro: 'A senha precisa ter de 8 a 100 caracteres.' });
    if (login === String(process.env.ADMIN_USER || '').trim().toLowerCase()) {
      return res.status(409).json({ erro: 'Este login já existe. Escolha outro.' });
    }
    const todos = await getUsers();
    if (todos.filter((u) => u.status === 'pendente').length >= MAX_PENDENTES) {
      return res.status(429).json({ erro: 'Há muitos pedidos aguardando aprovação. Fale com o administrador.' });
    }
    const { salt, hash } = await hashPw(senha);
    const novo = { nome, login, salt, hash, status: 'pendente', criadoEm: new Date().toISOString() };
    const criou = await createUser(login, novo);
    if (!criou) return res.status(409).json({ erro: 'Este login já existe. Escolha outro.' });
    await avisarCadastro(novo);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ erro: require('../lib/erro')(e) });
  }
};
