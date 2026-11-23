"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import { type Familia, Presenca as PresencaType } from "@/lib/familias"
import { isFirestoreEnabled, carregarPresencaFirestore, salvarPresencaFirestore, carregarFamiliasFirestore } from "@/lib/firestore"

function getUltimosDomingos() {
    const hoje = new Date()
    const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
    const diaSemana = hojeSemHora.getDay()

    const ultimoDomingo = new Date(hojeSemHora)
    ultimoDomingo.setDate(hojeSemHora.getDate() - diaSemana)

    return Array.from({ length: 3 }, (_, index) => {
        const data = new Date(ultimoDomingo)
        data.setDate(ultimoDomingo.getDate() - index * 7)
        return data.toISOString().slice(0, 10)
    })
}

function formatDateDisplay(isoDate: string) {
    const d = new Date(isoDate + 'T00:00:00')
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}-${mm}-${yyyy}`
}

export default function PresencaPage() {
    const params = useParams()
    const password = Array.isArray(params?.password) ? params.password[0] : params?.password
    const basePath = password ? `/ward/${password}` : "/ward"

    const datas = getUltimosDomingos()
    const [dataSelecionada, setDataSelecionada] = useState(datas[0])
    const [busca, setBusca] = useState("")
    const [presencas, setPresencas] = useState<PresencaType[]>([])
    const [familias, setFamilias] = useState<Familia[]>([])
    const [erroFamilias, setErroFamilias] = useState("")
    const timerSalvarRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const presencasPendentesRef = useRef<PresencaType[]>([])
    const datasPendentesRef = useRef(new Set<string>())

    useEffect(() => {
        let mounted = true
        if (!password) return () => { mounted = false }

        if (isFirestoreEnabled()) {
            carregarPresencaFirestore(password).then((dados) => {
                if (mounted) {
                    presencasPendentesRef.current = dados
                    setPresencas(dados)
                }
            }).catch(() => {
                if (mounted) setPresencas([])
            })
        } else {
            setPresencas([])
        }

        carregarFamiliasFirestore(password).then((dados) => {
            if (mounted) setFamilias(dados)
        }).catch(() => {
            if (mounted) setErroFamilias("Não foi possível carregar os membros do Firebase.")
        })

        return () => {
            mounted = false
            if (timerSalvarRef.current) clearTimeout(timerSalvarRef.current)
            const datasPendentes = [...datasPendentesRef.current]
            if (password && datasPendentes.length > 0) {
                void salvarPresencaFirestore(presencasPendentesRef.current, password, datasPendentes).catch((error) => {
                    console.error("Falha ao salvar presenças pendentes", error)
                })
                datasPendentesRef.current.clear()
            }
        }
    }, [password])

    const estadosDaData = useMemo(() => new Map(
        presencas
            .filter((registro) => registro.data === dataSelecionada)
            .map((registro) => [registro.pessoaId, registro.estado]),
    ), [dataSelecionada, presencas])

    const pessoas = useMemo(() => {
        return familias.flatMap((familia) =>
            familia.membros.map((membro) => ({
                id: membro.id,
                nome: membro.nome,
                estado: estadosDaData.get(membro.id),
            })),
        )
    }, [estadosDaData, familias])

    const pessoasFiltradas = pessoas.filter((pessoa) =>
        pessoa.nome.toLowerCase().includes(busca.trim().toLowerCase()),
    )

    const totais = {
        presente: presencas.filter((registro) => registro.data === dataSelecionada && registro.estado === "presente").length,
        online: presencas.filter((registro) => registro.data === dataSelecionada && registro.estado === "online").length,
        estaca: presencas.filter((registro) => registro.data === dataSelecionada && registro.estado === "estaca").length,
    }

    function alternarPresenca(pessoaId: string) {
        const estadoAtual = estadosDaData.get(pessoaId)
        const proximoEstado: PresencaType["estado"] | undefined = estadoAtual === undefined
            ? "presente"
            : estadoAtual === "presente"
                ? "online"
                : estadoAtual === "online"
                    ? "estaca"
                    : undefined
        const semRegistro = presencas.filter(
            (registro) => !(registro.data === dataSelecionada && registro.pessoaId === pessoaId),
        )
        const atualizado = proximoEstado
            ? [...semRegistro, { id: `${dataSelecionada}-${pessoaId}`, data: dataSelecionada, pessoaId, estado: proximoEstado }]
            : semRegistro

        presencasPendentesRef.current = atualizado
        datasPendentesRef.current.add(dataSelecionada)
        setPresencas(atualizado)

        if (!isFirestoreEnabled()) return
        if (timerSalvarRef.current) clearTimeout(timerSalvarRef.current)
        timerSalvarRef.current = setTimeout(() => {
            const datasParaSalvar = [...datasPendentesRef.current]
            datasPendentesRef.current.clear()
            void salvarPresencaFirestore(presencasPendentesRef.current, password, datasParaSalvar).catch((error) => {
                console.error("Falha ao salvar presenças", error)
                setErroFamilias("Não foi possível salvar as presenças no Firebase.")
            })
        }, 3000)
    }

    if (!password) {
        return <div>Senha não definida</div>
    }

    return (
        <div className="screen-content" style={{ fontFamily: "sans-serif" }}>
            <div className="attendance-page">
                <div className="attendance-content">
                    {erroFamilias && <p role="alert" style={{ color: "#b42318" }}>{erroFamilias}</p>}
                    <section className="attendance-controls" aria-label="Controles de presença">
                        <div className="attendance-dates">
                            {datas.map((data) => (
                                <button
                                    key={data}
                                    type="button"
                                    aria-pressed={data === dataSelecionada}
                                    onClick={() => setDataSelecionada(data)}
                                    className="attendance-date"
                                    style={{
                                        background: data === dataSelecionada ? "var(--button-bg)" : "transparent",
                                        color: data === dataSelecionada ? "var(--button-text)" : "var(--foreground)",
                                        border: "1px solid var(--border-color)",
                                        cursor: "pointer",
                                    }}
                                >
                                    {formatDateDisplay(data)}
                                </button>
                            ))}
                        </div>
                        <div className="attendance-summary" aria-label="Resumo de presenças">
                            <div className="attendance-count">
                                <strong>{totais.presente}</strong>
                                <span>Presencial</span>
                            </div>
                            <div className="attendance-count">
                                <strong>{totais.online}</strong>
                                <span>Online</span>
                            </div>
                            <div className="attendance-count">
                                <strong>{totais.estaca}</strong>
                                <span>Estaca</span>
                            </div>
                        </div>
                    </section>

                    <div className="attendance-list-container">
                        <input
                            type="text"
                            value={busca}
                            onChange={(event) => setBusca(event.target.value)}
                            placeholder="Buscar pessoa..."
                            aria-label="Buscar pessoa"
                            className="attendance-search"
                        />

                        <div className="attendance-list">
                            {pessoasFiltradas.length === 0 ? (
                                <p style={{ margin: 0, textAlign: "center" }}>Nenhuma pessoa encontrada.</p>
                            ) : (
                                pessoasFiltradas.map((pessoa) => {
                                    const cores = {
                                        presente: "#1a7f5a",
                                        online: "#1769aa",
                                        estaca: "#a34b00",
                                    }
                                    const rotulos = {
                                        presente: "Presencial",
                                        online: "Online",
                                        estaca: "Estaca",
                                    }
                                    return (
                                        <button
                                            key={pessoa.id}
                                            type="button"
                                            onClick={() => alternarPresenca(pessoa.id)}
                                            aria-label={`${pessoa.nome}: ${pessoa.estado ? rotulos[pessoa.estado] : "Ausente"}. Clique para alterar.`}
                                            aria-pressed={Boolean(pessoa.estado)}
                                            className="attendance-person"
                                            style={{
                                                background: pessoa.estado ? cores[pessoa.estado] : "transparent",
                                                color: pessoa.estado ? "#ffffff" : "var(--foreground)",
                                            }}
                                        >
                                            <span className="attendance-person-name">{pessoa.nome}</span>
                                            <span className="attendance-person-status">{pessoa.estado ? rotulos[pessoa.estado] : "Ausente"}</span>
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
