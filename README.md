# Project Ward

Uma aplicação em desenvolvimento para apoiar a organização de uma ala de **A Igreja de Jesus Cristo dos Santos dos Últimos Dias**. O objetivo é facilitar o acompanhamento de famílias e membros, o registro de presença e a preparação das reuniões — com a possibilidade de evoluir para uma ata virtual.

O projeto é independente e **não é um produto oficial nem é afiliado ou endossado pela Igreja**. Ele não substitui sistemas, orientações ou registros oficiais.

## O que já funciona

- Cadastro e consulta de famílias e seus membros.
- Registro de presença aos domingos, com opções presencial, online e participação na estaca.
- Consulta de domingos recentes e quantidade de pessoas registradas.
- Organização de discursos por domingo, com pessoa designada e tema opcional; o limite atual é de três discursos por domingo.
- Separação dos dados por ala no Firestore.
- Login com Google e controle de acesso por e-mail e ala, quando o Firebase está configurado.

O escopo atual é um **MVP em validação**. A ata virtual e as sugestões automáticas descritas no roadmap ainda não estão implementadas.

## Roadmap

As etapas abaixo combinam o estado atual do projeto com as ideias do rascunho. São objetivos de desenvolvimento, não prazos ou funcionalidades já disponíveis.

### v0.1 — MVP e validação

- [x] Cadastro de famílias e membros.
- [x] Registro e consulta de presença.
- [x] Organização de discursos por domingo.
- [ ] Revisar privacidade, permissões e minimização de dados antes de registrar informações pessoais ou sensíveis.
- [ ] Ampliar testes e validar os fluxos com usuários.

### v1.1 — Preparação das reuniões

- [ ] Organizar a programação da reunião, incluindo orações, discursos e temas.
- [ ] Sugerir participantes para orações e discursos, e temas para os discursos.
- [ ] Preparar convites e mensagens para copiar ou compartilhar por WhatsApp e e-mail.

### v1.2 — Ministração e ata

- [ ] Adicionar Hinos
- [ ] Gerar uma semi-ata virtual para apoiar os registros da reunião.


### v1.3 — Indicadores

- [ ] Criar gráficos e resumos para acompanhar presença e outras informações ao longo do tempo.

### v2.0 — Integrações

- [ ] Avaliar uma possível integração com [ChurchofJesusChrist.org](https://www.churchofjesuschrist.org/?lang=por), condicionada à existência de meios oficiais disponíveis e às devidas permissões.

### Rascunho de referência

![Rascunho original das ideias para o roadmap](./public/roadmap.jpeg)

## Tecnologias

- Next.js 16 e React 19
- TypeScript
- Firebase Authentication e Cloud Firestore

## Como executar localmente

Pré-requisitos: Node.js e npm.

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Configure o Firebase e as variáveis de ambiente conforme [FIRESTORE_SETUP.md](./FIRESTORE_SETUP.md). Não publique o arquivo `.env.local`.

3. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

4. Acesse [http://localhost:3000](http://localhost:3000).

## Verificações

```bash
npm test
npm run test:coverage
npm run lint
npm run build
```

## Privacidade e segurança

Os dados de famílias e membros podem incluir informações pessoais. Use dados fictícios em demonstrações e configure o Firebase Authentication e as regras do Firestore antes de qualquer uso com dados reais. O identificador da ala na URL serve para separar os dados, mas **não é uma senha nem um mecanismo de autenticação**. Consulte [FIRESTORE_SETUP.md](./FIRESTORE_SETUP.md) e [docs/data-model.md](./docs/data-model.md) para detalhes.
