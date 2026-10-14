# Guia de Operação Zig

Guia de consulta para celular, com modo administrador. Contatos de supervisores e a
exibição de cada item são salvos num banco (Upstash Redis) e valem para todos os usuários.

## Como publicar no Vercel

1. **GitHub**: crie um repositório **privado** e envie todos os arquivos desta pasta
   (`index.html`, `package.json`, `README.md` e as pastas `api` e `lib`).
2. **Vercel**: em *Add New › Project*, escolha esse repositório e clique em *Deploy*.
   Não precisa mudar nenhuma configuração de build.
3. **Banco de dados**: no projeto, abra *Storage* › *Marketplace* › **Upstash (Redis)** e
   conecte ao projeto. O Vercel cria sozinho as variáveis do banco
   (`KV_REST_API_URL` e `KV_REST_API_TOKEN`; o código também aceita
   `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`).
4. **Variáveis de ambiente**: em *Settings › Environment Variables*, crie:

   | Nome | Valor | Obrigatória |
   |---|---|---|
   | `ADMIN_USER` | login do administrador principal | sim |
   | `ADMIN_PASSWORD` | senha do administrador principal | sim |
   | `SESSION_SECRET` | um texto aleatório longo (mínimo 16 caracteres) | sim |
   | `NOTIFY_EMAIL` | `luis.pio@outlook.com` (e-mail que recebe os pedidos de acesso) | para o aviso por e-mail |
   | `RESEND_API_KEY` | chave de API do Resend (passo 5) | para o aviso por e-mail |
   | `SITE_URL` | endereço do guia, ex.: `https://guia-zig.vercel.app` | só se usar domínio próprio |
   | `MAIL_FROM` | remetente, ex.: `Guia Zig <aviso@seudominio.com>` | só se tiver domínio verificado no Resend |

   Digite o login e a senha **direto no Vercel**. Não escreva a senha em nenhum arquivo do
   repositório.
5. **Aviso por e-mail** (opcional, mas recomendado): crie uma conta no
   [Resend](https://resend.com), de preferência com o mesmo e-mail que vai receber os avisos,
   crie uma chave de API e cadastre em `RESEND_API_KEY`. Com o remetente de teste do Resend
   (o padrão), as mensagens só chegam ao e-mail da própria conta. Para enviar a outros
   endereços, é preciso verificar um domínio no Resend e preencher `MAIL_FROM`. Na primeira
   vez, confira também a caixa de spam. Se essas variáveis não existirem, o cadastro funciona
   do mesmo jeito, só sem o aviso, e você aprova pela tela *Usuários e acessos*.
6. **Novo deploy**: em *Deployments*, abra o mais recente › *Redeploy*. As variáveis só
   valem depois disso.
7. **Teste**: abra o endereço do projeto, toque na capa, entre em *Acesso administrador*,
   altere um contato e abra o mesmo endereço em outro aparelho. Depois teste o cadastro de
   um usuário de teste e confira se o e-mail chegou.

## Como funciona

- Quem abre o link só visualiza. Não precisa de conta de nada.
- **Administrador principal**: o login e a senha definidos no Vercel. Edita tudo e aprova usuários.
- **Novos usuários**: em *Acesso administrador*, tocam em **Cadastrar**, informam nome, login
  e senha (mínimo 8 caracteres) e ficam **pendentes**. Só entram depois de aprovados.
  Usuários aprovados editam contatos e a exibição dos itens, mas não aprovam ninguém.
- **Aprovação**: a cada pedido, o e-mail definido em `NOTIFY_EMAIL` recebe uma mensagem com
  os botões **Aprovar** e **Recusar**. O link abre uma página pedindo confirmação, e só o
  botão dessa página decide (assim, leitores de e-mail e antivírus que abrem links sozinhos
  não aprovam ninguém por engano). Os links valem por 7 dias e só funcionam uma vez.
  Também dá para decidir em *Usuários e acessos*, no próprio guia, com o login principal.
- **Remover acesso**: em *Usuários e acessos › Remover acesso*. A pessoa deixa de conseguir
  salvar na hora. Para trocar a senha de alguém, remova o acesso e a pessoa se cadastra de novo.
- As senhas dos usuários ficam guardadas só em forma embaralhada (scrypt), nunca em texto.
- A sessão dura 12 horas. Há no máximo 30 pedidos pendentes ao mesmo tempo.
- *Gestão do aplicativo* liga e desliga blocos, telas e itens. *Pedir Ajuda › Níveis de
  suporte* edita os contatos (telefone ou link de grupo do WhatsApp).
- As alterações aparecem para os usuários em até cerca de 10 segundos.
- Enquanto nada tiver sido salvo, o guia usa a configuração que veio embutida (contatos e
  itens ocultos de quando o projeto foi gerado). O primeiro salvamento passa a valer no lugar dela.

## Criar um usuário já aprovado (sem passar pelo cadastro)

No computador, dentro da pasta do projeto: `node tools/gerar-usuario.js meulogin "Meu Nome"`
(a senha é pedida no terminal e não fica salva). O comando imprime uma linha `HSET guia:users ...`;
cole no Upstash (*Data Browser › CLI*). O login passa a entrar direto, sem aprovação.

## Diagnóstico

Abra `SEU-ENDEREÇO/api/status`. Mostra `true`/`false` para cada variável (nunca os valores) e se o banco responde. Tudo que estiver `false` precisa ser cadastrado no Vercel, seguido de Redeploy.

Se o login do administrador for recusado e você não achar o motivo, crie a variável `DEBUG_LOGIN` com o valor `1`, faça Redeploy e tente de novo: a mensagem passa a dizer se o erro foi no login ou na senha. Depois, apague a variável.

## Mensagens de erro comuns

| Mensagem | O que fazer |
|---|---|
| "Acesso administrador não configurado no servidor" | Faltam `ADMIN_USER` ou `ADMIN_PASSWORD`. Cadastre e faça Redeploy. |
| "Erro no servidor" ao entrar | Falta `SESSION_SECRET` (mínimo 16 caracteres) ou o banco não está conectado. |
| "Erro no servidor" ao cadastrar ou salvar | O Upstash não está conectado ao projeto. Refaça o passo 3 e o Redeploy. |
| "Sessão expirada" | Entre de novo em *Acesso administrador*. |
| "Seu cadastro ainda aguarda a aprovação do administrador" | Aprove o pedido pelo e-mail ou em *Usuários e acessos*. |
| E-mail de aviso não chega | Confira `RESEND_API_KEY`, `NOTIFY_EMAIL`, a caixa de spam e a regra do remetente de teste (passo 5). |

Para trocar a senha do administrador principal, altere `ADMIN_PASSWORD` no Vercel e faça um novo Redeploy.
