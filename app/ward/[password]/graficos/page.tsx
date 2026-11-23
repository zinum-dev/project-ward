"use client"

import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { isFirestoreEnabled, carregarDiscursosFirestore, carregarFamiliasFirestore, carregarPresencaFirestore } from "@/lib/firestore"
import {
    getDomingosDosUltimosMeses,
    getUltimosNDomingos,
    resumirDesignacoesDiscurso,
    resumirEvolucaoSemanal,
    resumirPresencasPorDomingo,
    resumirRodizioPresenca,
    resumirTemasDiscurso,
    formatarTempoRelativo,
} from "@/lib/graficos-presenca.js"
import type { Familia, Presenca } from "@/lib/familias"

type Discurso = {
    id: string
    data: string
    pessoaId: string
    nome?: string
    tema?: string
}

const periods = [3, 6, 12]
const chartHeight = 280
const chartTop = 16
const chartBottom = 26
const chartLeft = 42
const chartRight = 12

function formatDate(date: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`))
}

function formatMonth(date: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        month: "short",
        timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`))
}

function getStep(count: number) {
    if (count <= 15) return 42
    if (count <= 30) return 26
    return 26
}

export default function GraficosPage() {
    const params = useParams()
    const wardParam = params?.password
    const ward = Array.isArray(wardParam) ? wardParam[0] : wardParam
    const [period, setPeriod] = useState(3)
    const [result, setResult] = useState<{
        ward: string | undefined
        familias: Familia[]
        presencas: Presenca[]
        discursos: Discurso[]
        referenceDate: string
        error: string
    } | null>(null)

    useEffect(() => {
        let active = true

        async function loadAttendance() {
            try {
                if (!ward) throw new Error("Não foi possível identificar a ala.")
                if (!isFirestoreEnabled()) {
                    throw new Error("O Firebase Firestore não está configurado para carregar os gráficos.")
                }

                const [familias, presencas, discursos] = await Promise.all([
                    carregarFamiliasFirestore(ward),
                    carregarPresencaFirestore(ward),
                    carregarDiscursosFirestore(ward),
                ])
                const now = new Date()
                const referenceDate = [
                    now.getFullYear(),
                    String(now.getMonth() + 1).padStart(2, "0"),
                    String(now.getDate()).padStart(2, "0"),
                ].join("-")
                if (active) setResult({ ward, familias, presencas, discursos, referenceDate, error: "" })
            } catch (reason) {
                if (active) {
                    setResult({
                        ward,
                        familias: [],
                        presencas: [],
                        discursos: [],
                        referenceDate: "",
                        error: reason instanceof Error ? reason.message : String(reason),
                    })
                }
            }
        }

        void loadAttendance()

        return () => { active = false }
    }, [ward])

    const currentResult = result?.ward === ward ? result : null
    const erro = currentResult?.error ?? ""
    const loading = currentResult === null
    const rodizioDomingos = useMemo(() => getUltimosNDomingos(12), [])

    const chartData = useMemo(() => {
        const dates = getDomingosDosUltimosMeses(period)
        return resumirPresencasPorDomingo(currentResult?.presencas ?? [], dates)
    }, [currentResult, period])

    const datesInPeriod = useMemo(() => getDomingosDosUltimosMeses(period), [period])
    const weeklyData = useMemo(
        () => resumirEvolucaoSemanal(currentResult?.presencas ?? [], datesInPeriod),
        [currentResult, datesInPeriod],
    )
    const designacoes = useMemo(
        () => resumirDesignacoesDiscurso(currentResult?.familias ?? [], currentResult?.discursos ?? [], datesInPeriod),
        [currentResult, datesInPeriod],
    )
    const temas = useMemo(
        () => resumirTemasDiscurso(currentResult?.discursos ?? [], datesInPeriod),
        [currentResult, datesInPeriod],
    )
    const rodizio = useMemo(
        () => resumirRodizioPresenca(currentResult?.familias ?? [], currentResult?.presencas ?? [], rodizioDomingos),
        [currentResult, rodizioDomingos],
    )
    const total = chartData.reduce((sum, item) => sum + item.presente + item.online + item.estaca, 0)
    const step = getStep(chartData.length)
    const width = chartLeft + chartRight + chartData.length * step
    const plotHeight = chartHeight - chartTop - chartBottom
    const highestValue = Math.max(0, ...chartData.map((item) => item.presente + item.online + item.estaca))
    const axisMax = Math.max(4, Math.ceil(highestValue / 4) * 4)
    const barWidth = Math.min(20, step * 0.62)
    const maxTema = Math.max(1, ...temas.map((item) => item.quantidade))
    const lineMax = Math.max(4, Math.ceil(Math.max(0, ...weeklyData.map((item) => item.total)) / 4) * 4)
    const linePlotHeight = chartHeight - chartTop - chartBottom
    const lineSeries = [
        { key: "presente", label: "Presencial", color: "is-present" },
        { key: "online", label: "Online", color: "is-online" },
        { key: "estaca", label: "Estaca", color: "is-stake" },
        { key: "total", label: "Total", color: "is-total" },
    ] as const

    function pointFor(index: number, value: number) {
        return {
            x: chartLeft + index * step + step / 2,
            y: chartTop + linePlotHeight - linePlotHeight * value / lineMax,
        }
    }


    return (
        <main className="screen-content">
            <section className="attendance-chart-page">
                <header className="attendance-chart-header">
                    <div>
                        <h1>Presenças por domingo</h1>
                        <p>Distribuição das presenças registradas por tipo de participação.</p>
                    </div>
                    <label className="attendance-chart-period">
                        Período
                        <select
                            value={period}
                            onChange={(event) => setPeriod(Number(event.target.value))}
                            aria-label="Período do gráfico"
                        >
                            {periods.map((months) => (
                                <option key={months} value={months}>{months} meses</option>
                            ))}
                        </select>
                    </label>
                </header>

                {erro && <p role="alert" className="attendance-chart-error">{erro}</p>}
                {loading ? (
                    <p role="status">Carregando presenças...</p>
                ) : !erro && (
                    <>
                        <div className="attendance-chart-summary">
                            <strong>{total}</strong>
                            <span>registros de participação no período</span>
                        </div>
                        {total === 0 && <p>Nenhuma presença registrada no período selecionado.</p>}

                        <ul className="attendance-chart-legend" aria-label="Tipos de participação">
                            <li><span className="attendance-chart-swatch is-present" />Presencial</li>
                            <li><span className="attendance-chart-swatch is-online" />Online</li>
                            <li><span className="attendance-chart-swatch is-stake" />Estaca</li>
                        </ul>

                        <section className="weekly-line-chart" aria-labelledby="weekly-line-chart-title">
                            <h2 id="weekly-line-chart-title">Evolução semanal</h2>
                            <ul className="attendance-chart-legend" aria-label="Séries do gráfico semanal">
                                {lineSeries.map((series) => (
                                    <li key={series.key}>
                                        <span className={`attendance-chart-line-swatch ${series.color}`} />
                                        {series.label}
                                    </li>
                                ))}
                            </ul>
                            <div className="attendance-chart-scroll">
                                <svg
                                    className="attendance-chart-svg"
                                    viewBox={`0 0 ${width} ${chartHeight}`}
                                    role="img"
                                    aria-label={`Evolução semanal de presenças presenciais, online, na estaca e total nos últimos ${period} meses`}
                                >
                                    {[0, 1, 2, 3, 4].map((tick) => {
                                        const value = lineMax * tick / 4
                                        const y = chartTop + linePlotHeight - linePlotHeight * tick / 4
                                        return (
                                            <g key={tick}>
                                                <line className="attendance-chart-gridline" x1={chartLeft} x2={width - chartRight} y1={y} y2={y} />
                                                <text className="attendance-chart-axis-label" x={chartLeft - 8} y={y + 4} textAnchor="end">{value}</text>
                                            </g>
                                        )
                                    })}
                                    {lineSeries.map((series) => {
                                        const points = weeklyData.map((item, index) =>
                                            pointFor(index, item[series.key]),
                                        )
                                        const pointList = points.map(({ x, y }) => `${x},${y}`).join(" ")
                                        return (
                                            <g key={series.key}>
                                                <polyline
                                                    className={`attendance-chart-line ${series.color}`}
                                                    points={pointList}
                                                />
                                                {weeklyData.map((item, index) => {
                                                    const point = points[index]
                                                    return (
                                                        <circle
                                                            key={item.data}
                                                            className={`attendance-chart-line-point ${series.color}`}
                                                            cx={point.x}
                                                            cy={point.y}
                                                            r={3}
                                                        >
                                                            <title>
                                                                {formatDate(item.data)} — {series.label}: {item[series.key]}
                                                            </title>
                                                        </circle>
                                                    )
                                                })}
                                            </g>
                                        )
                                    })}
                                    {weeklyData.map((item, index) => (
                                        (index === 0 || item.data.slice(0, 7) !== weeklyData[index - 1].data.slice(0, 7)) && (
                                            <text
                                                key={item.data}
                                                className="attendance-chart-month-label"
                                                x={pointFor(index, 0).x}
                                                y={chartHeight - 8}
                                                textAnchor="middle"
                                            >
                                                {formatMonth(item.data)}
                                            </text>
                                        )
                                    ))}
                                </svg>
                            </div>
                        </section>

                        <div className="attendance-chart-scroll">
                            <svg
                                className="attendance-chart-svg"
                                viewBox={`0 0 ${width} ${chartHeight}`}
                                role="img"
                                aria-label={`Gráfico empilhado de presenças nos últimos ${period} meses`}
                            >
                                {[0, 1, 2, 3, 4].map((tick) => {
                                    const value = axisMax * tick / 4
                                    const y = chartTop + plotHeight - plotHeight * tick / 4
                                    return (
                                        <g key={tick}>
                                            <line className="attendance-chart-gridline" x1={chartLeft} x2={width - chartRight} y1={y} y2={y} />
                                            <text className="attendance-chart-axis-label" x={chartLeft - 8} y={y + 4} textAnchor="end">{value}</text>
                                        </g>
                                    )
                                })}
                                {chartData.map((item, index) => {
                                    const x = chartLeft + index * step + (step - barWidth) / 2
                                    const totalDomingo = item.presente + item.online + item.estaca
                                    const values = [
                                        { key: "presente", value: item.presente, className: "is-present" },
                                        { key: "online", value: item.online, className: "is-online" },
                                        { key: "estaca", value: item.estaca, className: "is-stake" },
                                    ] as const
                                    let accumulated = 0

                                    return (
                                        <g key={item.data}>
                                            <title>
                                                {formatDate(item.data)}: {item.presente} presencial, {item.online} online, {item.estaca} estaca
                                            </title>
                                            {values.map(({ key, value, className }) => {
                                                const height = plotHeight * value / axisMax
                                                const y = chartTop + plotHeight - plotHeight * (accumulated + value) / axisMax
                                                accumulated += value
                                                return value > 0 ? (
                                                    <rect
                                                        key={key}
                                                        className={`attendance-chart-bar ${className}`}
                                                        x={x}
                                                        y={y}
                                                        width={barWidth}
                                                        height={height}
                                                        rx={2}
                                                    />
                                                ) : null
                                            })}
                                            {totalDomingo > 0 && (
                                                <text
                                                    className="attendance-chart-month-label"
                                                    x={chartLeft + index * step + step / 2}
                                                    y={chartHeight - chartBottom + 14}
                                                    textAnchor="middle"
                                                >
                                                    {formatMonth(item.data)}
                                                </text>
                                            )}
                                        </g>
                                    )
                                })}
                                {chartData.length === 0 && (
                                    <text className="attendance-chart-axis-label" x={chartLeft + 8} y={chartTop + 18}>Sem domingos no período</text>
                                )}
                            </svg>
                        </div>

                        <details className="attendance-chart-details">
                            <summary>Ver dados por domingo</summary>
                            <div className="attendance-chart-table-scroll">
                                <table>
                                    <thead>
                                        <tr>
                                            <th scope="col">Domingo</th>
                                            <th scope="col">Presencial</th>
                                            <th scope="col">Online</th>
                                            <th scope="col">Estaca</th>
                                            <th scope="col">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...chartData].reverse().map((item) => (
                                            <tr key={item.data}>
                                                <th scope="row">{formatDate(item.data)}</th>
                                                <td>{item.presente}</td>
                                                <td>{item.online}</td>
                                                <td>{item.estaca}</td>
                                                <td>{item.presente + item.online + item.estaca}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </details>

                        <section className="rotation-chart" aria-labelledby="rotation-chart-title">
                            <header>
                                <div>
                                    <h2 id="rotation-chart-title">Rodízio de presença</h2>
                                    <p>
                                        Participações nos últimos 12 domingos, entre {formatDate(rodizioDomingos[0])} e{" "}
                                        {formatDate(rodizioDomingos[rodizioDomingos.length - 1])}.
                                    </p>
                                </div>
                                <strong>{rodizio.totalPessoas} pessoas cadastradas</strong>
                            </header>
                            <p className="rotation-chart-note">
                                Presencial, online e participação na estaca contam como participação. Pessoas sem registro entram na faixa “Nenhuma”.
                            </p>
                            {rodizio.totalPessoas === 0 ? (
                                <p>Nenhuma pessoa cadastrada para este período.</p>
                            ) : (
                                <ul className="rotation-chart-ranges">
                                    {rodizio.ranges.map((range) => (
                                        <li key={range.id}>
                                            <div className="rotation-chart-range-label">
                                                <span>{range.label}</span>
                                                <strong>{range.count} ({Math.round(range.count / rodizio.totalPessoas * 100)}%)</strong>
                                            </div>
                                            <div
                                                className="rotation-chart-track"
                                                role="img"
                                                aria-label={`${range.label}: ${range.count} pessoas`}
                                            >
                                                <span style={{ width: `${range.count / rodizio.totalPessoas * 100}%` }} />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        <section className="rotation-chart speech-chart" aria-labelledby="speech-rotation-title">
                            <header>
                                <div>
                                    <h2 id="speech-rotation-title">Rodízio de discursos</h2>
                                    <p>Designações no período de {period} meses e tempo desde a última designação.</p>
                                </div>
                                <strong>{designacoes.length} pessoas cadastradas</strong>
                            </header>
                            {designacoes.length === 0 ? (
                                <p>Nenhuma pessoa cadastrada.</p>
                            ) : (
                                <details className="attendance-chart-details">
                                    <summary>Ver designações por pessoa</summary>
                                    <div className="attendance-chart-table-scroll">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th scope="col">Pessoa</th>
                                                    <th scope="col">Designações</th>
                                                    <th scope="col">Última designação</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {designacoes.map((item) => (
                                                    <tr key={item.pessoaId}>
                                                        <th scope="row">{item.nome}</th>
                                                        <td>{item.quantidade}</td>
                                                        <td>
                                                            {item.ultimaData
                                                                ? `${formatarTempoRelativo(item.ultimaData, currentResult.referenceDate)} (${formatDate(item.ultimaData)})`
                                                                : "Nunca designado"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </details>
                            )}
                        </section>

                        <section className="rotation-chart" aria-labelledby="speech-themes-title">
                            <header>
                                <div>
                                    <h2 id="speech-themes-title">Temas dos discursos</h2>
                                    <p>Temas mais frequentes nos últimos {period} meses.</p>
                                </div>
                                <strong>{temas.length} temas registrados</strong>
                            </header>
                            {temas.length === 0 ? (
                                <p>Nenhum tema registrado no período selecionado.</p>
                            ) : (
                                <ul className="speech-theme-list">
                                    {temas.map((item) => (
                                        <li key={item.tema}>
                                            <div className="rotation-chart-range-label">
                                                <span>{item.tema}</span>
                                                <strong>{item.quantidade} {item.quantidade === 1 ? "discurso" : "discursos"}</strong>
                                            </div>
                                            <div
                                                className="rotation-chart-track"
                                                role="img"
                                                aria-label={`${item.tema}: ${item.quantidade} discursos`}
                                            >
                                                <span style={{ width: `${item.quantidade / maxTema * 100}%` }} />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </>
                )}
            </section>
        </main>
    )
}
