"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { carregarFamilias, carregarPresenca, salvarPresenca, Presenca as PresencaType } from "@/lib/familias"
import { isFirestoreEnabled, carregarPresencaFirestore, salvarPresencaFirestore } from "@/lib/firestore"

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

    if (!password) {
        return <div>Senha não definida</div>
    }

    const datas = getUltimosDomingos()
    const [dataSelecionada, setDataSelecionada] = useState(datas[0])
    const [busca, setBusca] = useState("")
    const [presencas, setPresencas] = useState<PresencaType[]>([])

    useEffect(() => {
        let mounted = true
        if (isFirestoreEnabled()) {
            carregarPresencaFirestore().then((dados) => {
                if (mounted) setPresencas(dados)
            })
        } else {
            setPresencas(carregarPresenca())
        }

        return () => {
            mounted = false
        }
    }, [])

    const pessoas = useMemo(() => {
        return carregarFamilias().flatMap((familia) =>
            familia.membros.map((membro) => ({
                id: membro.id,
                nome: membro.nome,
                presente: presencas.some(
                    (registro) => registro.data === dataSelecionada && registro.pessoaId === membro.id && registro.presente,
                ),
            })),
        )
    }, [dataSelecionada, presencas])

    const pessoasFiltradas = pessoas.filter((pessoa) =>
        pessoa.nome.toLowerCase().includes(busca.trim().toLowerCase()),
    )

    const totalPresentes = presencas.filter((registro) => registro.data === dataSelecionada && registro.presente).length

    function alternarPresenca(pessoaId: string) {
        const pessoaAtual = pessoas.find((pessoa) => pessoa.id === pessoaId)
        const presente = pessoaAtual ? pessoaAtual.presente : false

        const proximoEstado = !presente

        setPresencas((atual) => {
            const semRegistro = atual.filter(
                (registro) => !(registro.data === dataSelecionada && registro.pessoaId === pessoaId),
            )

            const atualizado = [
                ...semRegistro,
                {
                    id: `pre-${Date.now()}`,
                    data: dataSelecionada,
                    pessoaId,
                    presente: proximoEstado,
                },
            ]
            // persist according to selected storage
            if (isFirestoreEnabled()) {
                // don't await - fire and forget
                salvarPresencaFirestore(atualizado).catch(() => { })
            } else {
                salvarPresenca(atualizado)
            }
            return atualizado
        })
    }

    return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "sans-serif", padding: "32px 0" }}>
            <div style={{ width: "min(700px, 90vw)" }}>
                <div style={{ textAlign: "center" }}>
                    <h1 style={{ margin: 0, paddingBottom: 8, borderBottom: "1px solid var(--border-color)", display: "inline-block" }}>Presença</h1>
                </div>

                <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid var(--border-color)" }}>
                    <div style={{ display: "grid", gap: 12, textAlign: "center", marginBottom: 20 }}>
                        <Link href={`${basePath}/familias`}>Famílias</Link>
                        <Link href={`${basePath}/datas`}>Datas</Link>
                        <Link href={`${basePath}/discursos`}>Discursos</Link>
                        <Link href={`${basePath}/presenca`}>Presença</Link>
                    </div>

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
                            <div style={{ marginLeft: 12, fontWeight: 700 }}>{totalPresentes} presentes</div>
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
                                    <button
                                        key={pessoa.id}
                                        type="button"
                                        onClick={() => alternarPresenca(pessoa.id)}
                                        style={{
                                            width: "100%",
                                            textAlign: "left",
                                            padding: "10px 12px",
                                            border: "1px solid var(--border-color)",
                                            background: pessoa.presente ? "#1a7f5a" : "transparent",
                                            color: "var(--foreground)",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {pessoa.nome}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
