// Gera o comando que cria um usuário JÁ APROVADO no banco (Upstash Redis).
// Uso:  node tools/gerar-usuario.js <login> "<Nome Completo>" [senha]
// Sem a senha no comando, ela é pedida no terminal (não fica gravada em arquivo).
const crypto = require('crypto');
const readline = require('readline');
const [login, nome, senhaArg] = process.argv.slice(2);
if (!login || !nome || !/^[a-z0-9._-]{3,30}$/.test(login)) {
  console.error('Uso: node tools/gerar-usuario.js <login> "<Nome>" [senha]\nLogin: 3 a 30 caracteres (a-z, 0-9, . _ -), minúsculo.');
  process.exit(1);
}
const gerar = (senha) => {
  if (senha.length < 8) { console.error('A senha precisa ter pelo menos 8 caracteres.'); process.exit(1); }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(senha, Buffer.from(salt, 'hex'), 32).toString('hex');
  const agora = new Date().toISOString();
  const u = JSON.stringify({ nome, login, salt, hash, status: 'ativo', criadoEm: Date.now(), aprovadoEm: agora });
  console.log('\nCole no console do Upstash (Data Browser › CLI) e dê Enter:\n');
  console.log(`HSET guia:users ${login} '${u.replace(/'/g, "'\\''")}'\n`);
  console.log('Depois disso, o login já entra sem aprovação.');
};
if (senhaArg) gerar(senhaArg);
else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Senha (mín. 8 caracteres): ', (s) => { rl.close(); gerar(s); });
}
