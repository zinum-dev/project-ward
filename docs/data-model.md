# Modelagem de Dados — Project Ward

Este documento descreve a modelagem local (localStorage) e remota (Firestore) usada pela aplicação.

## Convenção de namespacing por ward/password
- Cada ward é identificada pelo `password` que o usuário informa na URL (`/ward/{password}`).
- LocalStorage: chaves no formato `ward.{password}.{tipo}`
  - Ex.: `ward.minhaSenha.familias`, `ward.minhaSenha.presenca`, `ward.minhaSenha.discursos`, `ward.minhaSenha.pessoas`
- Firestore (recomendado): coleção `wards` com subcoleções por ward id (o `password`):
  - `wards/{wardId}/familias`
  - `wards/{wardId}/presencas`
  - `wards/{wardId}/discursos`
  - `wards/{wardId}/pessoas`

> Alternativa: usar coleções top-level (`familias`, `presencas`) e incluir o campo `ward: string` em cada documento; vantajoso quando se deseja consultar cross-wards, mas menos organizado.

---

## Entidades principais

### Ward (namespace)
- id: string (o `password` usado como identificador)
- displayName: string (opcional)

### Familia
Representa um grupo/família.
- id: string (ex.: `fam-163423423`) — gerado localmente com `Date.now()`.
- nome: string
- telefone?: string
- endereco?: string
- observacoes?: string
- membros: Pessoa[]

Exemplo (localStorage / Firestore doc):
{
  "id": "fam-1690000000000",
  "nome": "Silva",
  "telefone": "(11) 99999-9999",
  "endereco": "Rua A, 123",
  "observacoes": "Alguma nota",
  "membros": [ /* array de Pessoa */ ]
}

### Pessoa
- id: string (ex.: `pes-1690000000123`)
- nome: string
- responsavel?: boolean
- observacoes?: string
- ultimoDiscurso?: string (ISO date)
- ultimoPresenca?: string (ISO date)
- presencasUltimos3Meses?: number

Observação: `pessoas` podem ser mantidas em coleção normalizada (`wards/{wardId}/pessoas`) para facilitar buscas, enquanto `membros` em `Familia` mantém a relação aninhada.

### Presenca
Registra presença de uma pessoa em uma data (domingo).
- id: string (ex.: `pre-1690000001234`)
- data: string (ISO yyyy-mm-dd)
- pessoaId: string
- presente: boolean

Armazenamento local: array de `Presenca` serializado em `ward.{password}.presenca`.
Firestore: documentos em `wards/{wardId}/presencas/{id}` ou um documento por data contendo `presentes: Presenca[]` — atualmente a implementação usa documentos individuais por `Presenca`.

### Discurso
- id: string
- data: string (ISO)
- pessoaId: string
- titulo?: string
- observacoes?: string

Regras de negócio relevantes:
- Máximo 3 discursos por domingo.
- Discursos referenciam `pessoaId` — não aceitam nomes livres.

---

## Exemplos de uso no código
- `carregarFamilias()` lê `localStorage.getItem("ward.{password}.familias")` e retorna `Familia[]`.
- `salvarPresenca()` grava em `ward.{password}.presenca` um array de `Presenca`.
- Firestore helpers devem aceitar o `wardId` e usar `wards/{wardId}/...` como caminho.

---

## Próximos passos sugeridos
- Atualizar as funções de persistência em `lib/familias.ts` e `lib/firestore.ts` para receber `wardId` (password) e usar keys / paths namespaced.
- Normalizar `pessoas` em `wards/{wardId}/pessoas` para permitir operações de busca e relacionamento sem iterar por todas as famílias.
- Implementar migração automática: quando abrir uma ward nova e existir dados locais sem namespace, oferecer migrar para `ward.{password}.XXX`.


> Arquivo gerado automaticamente pelo agente em 2026-09-07.
