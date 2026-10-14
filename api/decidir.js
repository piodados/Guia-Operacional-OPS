// Aprovar ou recusar um pedido de acesso pelo link do e-mail.
// O link só abre uma página de confirmação (GET). Quem decide é o botão (POST),
// assim leitores de e-mail e antivírus que "visitam" links não aprovam ninguém por engano.
const { verify } = require('../lib/auth');
const { getUser, saveUser, deleteUser } = require('../lib/store');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pagina = (titulo, corpo) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(titulo)}</title><style>
body{margin:0;background:#F4F7FF;color:#2B3350;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
main{max-width:480px;margin:0 auto;padding:32px 20px}h1{color:#0A1A5C;font-size:22px;line-height:1.25;margin:0 0 12px}
.box{background:#fff;border:1px solid #D6DFF5;border-radius:14px;padding:16px;margin:16px 0}
button,a.b{display:block;width:100%;box-sizing:border-box;text-align:center;border:0;border-radius:12px;padding:14px 16px;font:600 16px inherit;font-family:inherit;text-decoration:none;cursor:pointer;margin-bottom:10px}
.ok{background:#0052C2;color:#fff}.no{background:#B42318;color:#fff}.l{background:#E3EEFF;color:#0A1A5C}
</style></head><body><main>${corpo}</main></body></html>`;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const out = (code, titulo, corpo) => res.status(code).send(pagina(titulo, corpo));
  try {
    const q = req.query || {};
    const t = String(q.t || ''), a = String(q.a || '');
    const pl = verify(t);
    if (!pl || pl.k !== 'dec' || (a !== 'aprovar' && a !== 'recusar')) {
      return out(400, 'Link inválido', '<h1>Link inválido ou vencido</h1><p>Abra o guia, entre em <b>Acesso administrador</b> e use <b>Usuários e acessos</b>.</p>');
    }
    const u = await getUser(pl.u);
    if (!u || u.status !== 'pendente' || u.criadoEm !== pl.c) {
      return out(200, 'Pedido já tratado', '<h1>Este pedido já foi tratado</h1><p>Não há mais nada a fazer por este link.</p>');
    }
    const quem = `<div class="box"><b>${esc(u.nome)}</b><br>Login: ${esc(u.login)}</div>`;
    if (req.method === 'POST') {
      if (a === 'aprovar') {
        await saveUser(u.login, { ...u, status: 'ativo', aprovadoEm: new Date().toISOString() });
        return out(200, 'Acesso aprovado', `<h1>Acesso aprovado</h1>${quem}<p>Essa pessoa já pode entrar em <b>Acesso administrador</b> com o login e a senha que escolheu.</p>`);
      }
      await deleteUser(u.login);
      return out(200, 'Pedido recusado', `<h1>Pedido recusado</h1>${quem}<p>O cadastro foi apagado.</p>`);
    }
    if (req.method === 'GET') {
      const acao = `/api/decidir?t=${encodeURIComponent(t)}&a=${a}`;
      const aprovar = a === 'aprovar';
      return out(200, aprovar ? 'Aprovar acesso' : 'Recusar pedido',
        `<h1>${aprovar ? 'Aprovar este acesso?' : 'Recusar este pedido?'}</h1>${quem}` +
        (aprovar ? '<p>Quem for aprovado poderá alterar contatos e a exibição dos itens do guia.</p>' : '') +
        `<form method="post" action="${esc(acao)}"><button class="${aprovar ? 'ok' : 'no'}" type="submit">${aprovar ? 'Sim, aprovar' : 'Sim, recusar'}</button></form>` +
        '<p style="text-align:center;color:#5B6488;font-size:14px">Para não fazer nada, basta fechar esta página.</p>');
    }
    return out(405, 'Método não permitido', '<h1>Método não permitido</h1>');
  } catch (e) {
    return out(500, 'Erro', '<h1>Erro no servidor</h1><p>Tente de novo em instantes ou use o painel do guia.</p>');
  }
};
