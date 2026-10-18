# Modelagem de Dados — Project Ward

Este documento descreve a modelagem persistida no Firestore pela aplicação.

## Convenção de namespacing por ward/password
- Cada ward é identificada pelo `password` que o usuário informa na URL (`/ward/{password}`).
- Firestore: coleção `wards` com subcoleções por ward id (o `password`):
  - `wards/{wardId}/familias`
  - `wards/{wardId}/presencas`
  - `wards/{wardId}/discursos`

O `password` na URL serve apenas para selecionar o namespace; não é um mecanismo de autenticação ou autorização.

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

Exemplo de documento Firestore:
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

Os membros são armazenados somente dentro do documento da família. Presenças e discursos referenciam o `id` do membro; não há uma coleção duplicada de pessoas.

### Presenca
Registra o estado de presença de cada pessoa em uma data (domingo).
- estado: `presente`, `online` ou `estaca`
- ausente: pessoa sem entrada no mapa de estados

Firestore: um documento por data em `wards/{wardId}/presencas/{YYYY-MM-DD}`, contendo `statusPorPessoa: Record<pessoaId, estado>` e `updatedAt`.

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

## Persistência
- Os helpers de leitura e escrita recebem `wardId` e usam somente caminhos `wards/{wardId}/...`.
- Dados antigos eventualmente existentes no `localStorage` não são lidos nem migrados automaticamente.
- Preferências de interface, como o tema visual, podem continuar no armazenamento local do navegador; não são dados da ward.

---

> Atualizado em 2026-10-18.
