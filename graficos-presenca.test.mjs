import assert from "node:assert/strict"
import test from "node:test"

import {
    getDomingosDosUltimosMeses,
    getUltimosNDomingos,
    formatarTempoRelativo,
    resumirDesignacoesDiscurso,
    resumirEvolucaoSemanal,
    resumirPresencasPorDomingo,
    resumirRodizioPresenca,
    resumirTemasDiscurso,
} from "./lib/graficos-presenca.js"

test("gera os domingos dos meses selecionados em ordem cronológica", () => {
    const datas = getDomingosDosUltimosMeses(3, new Date(2026, 10, 23))

    assert.deepEqual(datas, [
        "2026-09-06",
        "2026-09-13",
        "2026-09-20",
        "2026-09-27",
        "2026-10-04",
        "2026-10-11",
        "2026-10-18",
        "2026-10-25",
        "2026-11-01",
        "2026-11-08",
        "2026-11-15",
        "2026-11-22",
    ])
})

test("inclui domingos sem registros e soma categorias sem duplicar pessoas", () => {
    const resultado = resumirPresencasPorDomingo([
        { data: "2026-11-01", pessoaId: "p1", estado: "presente" },
        { data: "2026-11-01", pessoaId: "p1", estado: "presente" },
        { data: "2026-11-01", pessoaId: "p2", estado: "online" },
        { data: "2026-11-01", pessoaId: "p3", estado: "estaca" },
        { data: "2026-11-08", pessoaId: "p4", estado: "ausente" },
        { data: "2026-10-25", pessoaId: "p5", estado: "presente" },
    ], ["2026-11-01", "2026-11-08"])

    assert.deepEqual(resultado, [
        { data: "2026-11-01", presente: 1, online: 1, estaca: 1 },
        { data: "2026-11-08", presente: 0, online: 0, estaca: 0 },
    ])
})

test("calcula séries semanais de cada categoria e do total, incluindo semanas vazias", () => {
    assert.deepEqual(resumirEvolucaoSemanal([
        { data: "2026-11-01", pessoaId: "p1", estado: "presente" },
        { data: "2026-11-01", pessoaId: "p2", estado: "online" },
        { data: "2026-11-01", pessoaId: "p3", estado: "estaca" },
        { data: "2026-11-08", pessoaId: "p4", estado: "presente" },
    ], ["2026-11-01", "2026-11-08", "2026-11-15"]), [
        { data: "2026-11-01", presente: 1, online: 1, estaca: 1, total: 3 },
        { data: "2026-11-08", presente: 1, online: 0, estaca: 0, total: 1 },
        { data: "2026-11-15", presente: 0, online: 0, estaca: 0, total: 0 },
    ])
})

test("rejeita período que não seja um número inteiro positivo", () => {
    assert.throws(() => getDomingosDosUltimosMeses(0), /meses inteiros/)
    assert.throws(() => getDomingosDosUltimosMeses(1.5), /meses inteiros/)
})

test("gera exatamente os últimos 12 domingos em ordem cronológica", () => {
    const datas = getUltimosNDomingos(12, new Date(2026, 10, 23))

    assert.equal(datas.length, 12)
    assert.equal(datas[0], "2026-09-06")
    assert.equal(datas.at(-1), "2026-11-22")
})

test("agrupa todas as pessoas cadastradas nas faixas do rodízio", () => {
    const pessoas = Array.from({ length: 5 }, (_, index) => ({
        id: `p${index}`,
        nome: `Pessoa ${index}`,
    }))
    const familias = [{ id: "f1", nome: "Família", membros: pessoas }]
    const datas = getUltimosNDomingos(12, new Date(2026, 10, 23))
    const presencas = [
        ...datas.slice(0, 9).map((data) => ({ pessoaId: "p1", data, estado: "presente" })),
        ...datas.slice(0, 6).map((data) => ({ pessoaId: "p2", data, estado: "online" })),
        ...datas.slice(0, 3).map((data) => ({ pessoaId: "p3", data, estado: "estaca" })),
        ...datas.map((data) => ({ pessoaId: "p4", data, estado: "presente" })),
        { pessoaId: "p3", data: datas[0], estado: "estaca" },
        ...datas.map((data) => ({ pessoaId: "fora-da-lista", data, estado: "presente" })),
    ]

    const resultado = resumirRodizioPresenca(familias, presencas, datas)

    assert.equal(resultado.totalPessoas, 5)
    assert.deepEqual(resultado.ranges.map(({ id, count }) => [id, count]), [
        ["none", 1],
        ["under-25", 0],
        ["25-49", 1],
        ["50-74", 1],
        ["75-100", 2],
    ])
})

test("resume designações por pessoa no período e mantém a data mais recente do histórico", () => {
    const familias = [{
        id: "f1",
        nome: "Família",
        membros: [
            { id: "p1", nome: "Ana" },
            { id: "p2", nome: "Bruno" },
            { id: "p3", nome: "Caio" },
        ],
    }]
    const discursos = [
        { pessoaId: "p1", data: "2026-11-01" },
        { pessoaId: "p1", data: "2026-10-04" },
        { pessoaId: "p1", data: "2026-05-03" },
        { pessoaId: "p2", data: "2026-04-05" },
        { pessoaId: "desconhecido", data: "2026-11-01" },
    ]

    assert.deepEqual(
        resumirDesignacoesDiscurso(familias, discursos, ["2026-10-04", "2026-11-01"]),
        [
            { pessoaId: "p1", nome: "Ana", quantidade: 2, ultimaData: "2026-11-01" },
            { pessoaId: "p2", nome: "Bruno", quantidade: 0, ultimaData: "2026-04-05" },
            { pessoaId: "p3", nome: "Caio", quantidade: 0, ultimaData: null },
        ],
    )
})

test("calcula o tempo relativo usando a data do discurso inclusive quando futura", () => {
    assert.equal(formatarTempoRelativo("2026-11-22", "2026-11-23"), "há 1 dia")
    assert.equal(formatarTempoRelativo("2026-11-23", "2026-11-23"), "hoje")
    assert.equal(formatarTempoRelativo("2026-12-01", "2026-11-23"), "em 8 dias")
})

test("agrupa temas equivalentes ignorando espaços, acentos e maiúsculas", () => {
    assert.deepEqual(
        resumirTemasDiscurso([
            { data: "2026-11-01", tema: "Fé em Jesus Cristo" },
            { data: "2026-11-08", tema: "  fé em jesus cristo " },
            { data: "2026-11-08", tema: "Serviço" },
            { data: "2026-10-25", tema: "Tema fora do período" },
            { data: "2026-11-15", tema: " " },
        ], ["2026-11-01", "2026-11-08"]),
        [
            { tema: "Fé em Jesus Cristo", quantidade: 2 },
            { tema: "Serviço", quantidade: 1 },
        ],
    )
})
