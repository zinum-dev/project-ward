function formatLocalDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

export function getUltimosNDomingos(count = 12, reference = new Date()) {
    if (!Number.isInteger(count) || count < 1) {
        throw new Error("A quantidade deve ser um número inteiro positivo.")
    }

    const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate())
    today.setDate(today.getDate() - today.getDay())

    return Array.from({ length: count }, (_, index) => {
        const sunday = new Date(today)
        sunday.setDate(today.getDate() - (count - index - 1) * 7)
        return formatLocalDate(sunday)
    })
}

export function getDomingosDosUltimosMeses(months, reference = new Date()) {
    if (!Number.isInteger(months) || months < 1) {
        throw new Error("O período deve ser informado em meses inteiros.")
    }

    const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate())
    const start = new Date(today.getFullYear(), today.getMonth() - months + 1, 1)
    const cursor = new Date(today)
    cursor.setDate(cursor.getDate() - cursor.getDay())

    const sundays = []
    while (cursor >= start) {
        sundays.push(formatLocalDate(cursor))
        cursor.setDate(cursor.getDate() - 7)
    }

    return sundays.reverse()
}

export function resumirPresencasPorDomingo(presencas, datas) {
    const resumos = new Map(datas.map((data) => [data, {
        data,
        presente: 0,
        online: 0,
        estaca: 0,
    }]))
    const pessoasPorData = new Map()

    for (const presenca of presencas) {
        const resumo = resumos.get(presenca.data)
        if (!resumo || !["presente", "online", "estaca"].includes(presenca.estado)) continue

        let pessoas = pessoasPorData.get(presenca.data)
        if (!pessoas) {
            pessoas = new Map()
            pessoasPorData.set(presenca.data, pessoas)
        }

        pessoas.set(presenca.pessoaId, presenca.estado)
    }

    for (const [data, pessoas] of pessoasPorData) {
        const resumo = resumos.get(data)
        for (const estado of pessoas.values()) {
            resumo[estado] += 1
        }
    }

    return [...resumos.values()]
}

export function resumirRodizioPresenca(familias, presencas, domingos) {
    const pessoaIds = new Set(
        familias.flatMap((familia) => familia.membros.map((pessoa) => pessoa.id)),
    )
    const domingosSelecionados = new Set(domingos)
    const presencasPorPessoa = new Map()

    for (const presenca of presencas) {
        if (!pessoaIds.has(presenca.pessoaId) || !domingosSelecionados.has(presenca.data)) continue
        if (!["presente", "online", "estaca"].includes(presenca.estado)) continue

        let datas = presencasPorPessoa.get(presenca.pessoaId)
        if (!datas) {
            datas = new Set()
            presencasPorPessoa.set(presenca.pessoaId, datas)
        }

        datas.add(presenca.data)
    }

    const ranges = [
        { id: "none", label: "Nenhuma (0 de 12)", min: 0, max: 0, count: 0 },
        { id: "under-25", label: "Baixa (1–2 de 12)", min: 1, max: 2, count: 0 },
        { id: "25-49", label: "25% a 49% (3–5 de 12)", min: 3, max: 5, count: 0 },
        { id: "50-74", label: "50% a 74% (6–8 de 12)", min: 6, max: 8, count: 0 },
        { id: "75-100", label: "75% a 100% (9–12 de 12)", min: 9, max: 12, count: 0 },
    ]

    for (const pessoaId of pessoaIds) {
        const count = presencasPorPessoa.get(pessoaId)?.size ?? 0
        const range = ranges.find(({ min, max }) => count >= min && count <= max)
        if (range) range.count += 1
    }

    return { totalPessoas: pessoaIds.size, ranges }
}

export function resumirDesignacoesDiscurso(familias, discursos, datasSelecionadas) {
    const pessoas = familias.flatMap((familia) => familia.membros)
    const datasNoPeriodo = new Set(datasSelecionadas)
    const designacoes = new Map(pessoas.map((pessoa) => [pessoa.id, {
        pessoaId: pessoa.id,
        nome: pessoa.nome,
        quantidade: 0,
        ultimaData: null,
    }]))

    for (const discurso of discursos) {
        const designacao = designacoes.get(discurso.pessoaId)
        if (!designacao || typeof discurso.data !== "string") continue

        if (!designacao.ultimaData || discurso.data > designacao.ultimaData) {
            designacao.ultimaData = discurso.data
        }

        if (datasNoPeriodo.has(discurso.data)) {
            designacao.quantidade += 1
        }
    }

    return [...designacoes.values()].sort((a, b) =>
        b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, "pt-BR"),
    )
}

export function resumirTemasDiscurso(discursos, datasSelecionadas) {
    const datasNoPeriodo = new Set(datasSelecionadas)
    const temas = new Map()

    for (const discurso of discursos) {
        if (!datasNoPeriodo.has(discurso.data)) continue
        const tema = String(discurso.tema ?? "").trim()
        if (!tema) continue

        const chave = tema.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLocaleLowerCase("pt-BR")
        const existente = temas.get(chave)
        if (existente) {
            existente.quantidade += 1
        } else {
            temas.set(chave, { tema, quantidade: 1 })
        }
    }

    return [...temas.values()].sort((a, b) =>
        b.quantidade - a.quantidade || a.tema.localeCompare(b.tema, "pt-BR"),
    )
}
