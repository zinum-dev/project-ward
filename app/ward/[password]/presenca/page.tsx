"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import { type Familia, Presenca as PresencaType } from "@/lib/familias"
import PageHeader from "@/lib/PageHeader"
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
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "sans-serif", padding: "32px 0" }}>
            <div style={{ width: "min(700px, 90vw)" }}>
                <div style={{ textAlign: "center" }}>
                    <PageHeader title={"Presença"} basePath={basePath} />
                </div>

                <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid var(--border-color)" }}>
                    {erroFamilias && <p role="alert" style={{ color: "#b42318" }}>{erroFamilias}</p>}
                    <div style={{ marginBottom: 16 }}>
                        <p style={{ margin: "0 0 8px" }}>Marcar presença:</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: 'center' }}>
                            {datas.map((data) => (
                                <button
                                    key={data}
                                    type="button"
                                    onClick={() => setDataSelecionada(data)}
                                    style={{
                                        background: data === dataSelecionada ? "var(--button-bg)" : "transparent",
                                        color: data === dataSelecionada ? "var(--button-text)" : "var(--foreground)",
                                        border: "1px solid var(--border-color)",
                                        padding: "6px 10px",
                                        cursor: "pointer",
                                    }}
                                >
                                    {formatDateDisplay(data)}
                                </button>
                            ))}
                            <div style={{ marginLeft: 12, fontWeight: 700 }}>
                                {totais.presente} presencial · {totais.online} online · {totais.estaca} estaca
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "grid", gap: 12 }}>
                        <input
                            type="text"
                            value={busca}
                            onChange={(event) => setBusca(event.target.value)}
                            placeholder="Buscar pessoa..."
                            style={{ padding: 8, border: "1px solid var(--border-color)", background: "transparent", color: "var(--input-text)" }}
                        />

                        <div style={{ display: "grid", gap: 8 }}>
                            {pessoasFiltradas.length === 0 ? (
                                <p style={{ margin: 0, textAlign: "center" }}>Nenhuma pessoa encontrada.</p>
                            ) : (
                                pessoasFiltradas.map((pessoa) => (
                                    (() => {
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
                                        style={{
                                            width: "100%",
                                            textAlign: "left",
                                            padding: "10px 12px",
                                            border: "1px solid var(--border-color)",
                                            background: pessoa.estado ? cores[pessoa.estado] : "transparent",
                                            color: pessoa.estado ? "#ffffff" : "var(--foreground)",
                                            cursor: "pointer",
                                        }}
                                    >
                                        <span style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                            <span>{pessoa.nome}</span>
                                            <span>{pessoa.estado ? rotulos[pessoa.estado] : "Ausente"}</span>
                                        </span>
                                    </button>
                                        )
                                    })()
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
