const { sign, safeEq, checkPw } = require('../lib/auth');
const { getUser } = require('../lib/store');

// Senha de mentira, só para gastar o mesmo tempo quando o login não existe.
const FALSO = { salt: '00112233445566778899aabbccddeeff', hash: '00'.repeat(32) };

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const limpa = (v) => String(v == null ? '' : v).normalize('NFKC').replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, '').trim().replace(/^(["'“”‘’])(.*)\1$/, '$2').trim();
    const login = limpa(b.login).toLowerCase();
    const senha = limpa(b.senha);
    const U = limpa(process.env.ADMIN_USER).toLowerCase();
    const P = limpa(process.env.ADMIN_PASSWORD);
    if (!U || !P) return res.status(500).json({ erro: 'Acesso administrador não configurado no servidor.' });
    const recusar = async (dica) => {
      await new Promise((r) => setTimeout(r, 600));
      const extra = process.env.DEBUG_LOGIN === '1' && dica ? ' [' + dica + ']' : '';
      return res.status(401).json({ erro: 'Login ou senha incorretos.' + extra });
    };

    // Administrador principal (definido no Vercel)
    if (login === U) {
      if (!safeEq(senha, P)) return recusar('login confere, senha não');
      return res.status(200).json({ token: sign({ role: 'master', u: U, n: 'Administrador' }), role: 'master', nome: 'Administrador' });
    }

    // Usuários cadastrados
    const u = await getUser(login);
    const ok = await checkPw(senha, (u || FALSO).salt, (u || FALSO).hash);
    if (!u || !ok) return recusar('login diferente de ADMIN_USER e sem cadastro');
    if (u.status !== 'ativo') {
      return res.status(403).json({ erro: 'Seu cadastro ainda aguarda a aprovação do administrador.' });
    }
    return res.status(200).json({ token: sign({ role: 'editor', u: login, n: u.nome }), role: 'editor', nome: u.nome });
  } catch (e) {
    return res.status(500).json({ erro: require('../lib/erro')(e) });
  }
};
