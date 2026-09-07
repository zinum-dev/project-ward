"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

import { carregarFamiliasEnriquecidas, carregarFamilias, salvarFamilias, type Familia } from "@/lib/familias"
import { carregarDiscursos, getUltimosDomingos } from "@/lib/discursos"
import { isFirestoreEnabled, carregarFamiliasFirestore, salvarFamiliasFirestore, carregarPresencaFirestore, carregarDiscursosFirestore } from "@/lib/firestore"
import { upsertPessoasFromFamilia } from "@/lib/pessoas"
import PageHeader from "@/lib/PageHeader"

export default function FamiliaDetalhePage() {
    const params = useParams()
    const password = Array.isArray(params?.password) ? params.password[0] : params?.password
    const id = Array.isArray(params?.id) ? params.id[0] : params?.id
    const basePath = password ? `/ward/${password}` : "/ward"
    const [familia, setFamilia] = useState<Familia | undefined>(undefined)
    const [discursos, setDiscursos] = useState<any[]>([])

    useEffect(() => {
        let mounted = true
        if (!id) {
            setFamilia(undefined)
            return
        }

        async function load() {
            if (isFirestoreEnabled()) {
                try {
                    const [fams, presencas, disc] = await Promise.all([
                        carregarFamiliasFirestore(password),
                        carregarPresencaFirestore(password),
                        carregarDiscursosFirestore(password),
                    ])

                    // enrich familias with presenca stats
                    const cutoff = new Date()
                    cutoff.setMonth(cutoff.getMonth() - 3)

                    const enriched = fams.map((familia) => ({
                        ...familia,
                        membros: familia.membros.map((membro) => {
                            const registros = presencas.filter((p: any) => p.pessoaId === membro.id && p.presente)
                            const ultimo = registros.length === 0 ? undefined : registros.slice().sort((a: any, b: any) => (a.data > b.data ? -1 : 1))[0].data
                            const contagem = registros.filter((r: any) => new Date(r.data) >= cutoff).length
                            return {
                                ...membro,
                                ultimoPresenca: ultimo,
                                presencasUltimos3Meses: contagem,
                            }
                        }),
                    }))

                    const encontrada = enriched.find((item) => item.id === id)
                    if (mounted) setFamilia(encontrada ?? fams.find((item) => item.id === id))
                    // also set discursos for local use (used below)
                    if (mounted) setDiscursos(disc)
                } catch (e) {
                    if (mounted) setFamilia(carregarFamilias(password).find((item) => item.id === id))
                }
            } else {
                const fams = carregarFamiliasEnriquecidas(password)
                const encontrada = fams.find((item) => item.id === id)
                if (mounted) setFamilia(encontrada ?? carregarFamilias(password).find((item) => item.id === id))
                if (mounted) setDiscursos(carregarDiscursos(password))
            }
        }

        load()

        return () => { mounted = false }
    }, [id])

    async function salvarFamiliaAtualizada(proximaFamilia: Familia) {
        const listagem = isFirestoreEnabled() ? await carregarFamiliasFirestore(password) : carregarFamilias(password)
        const atualizada = listagem.map((item) => (item.id === proximaFamilia.id ? proximaFamilia : item))
        if (isFirestoreEnabled()) {
            await salvarFamiliasFirestore(atualizada, password)
            // sync pessoas collection
            await upsertPessoasFromFamilia(proximaFamilia)
        } else {
            salvarFamilias(atualizada, password)
            // update local pessoas cache
            await upsertPessoasFromFamilia(proximaFamilia)
        }
        setFamilia(proximaFamilia)
    }

    function handleFamiliaChange(field: "nome" | "telefone" | "endereco" | "observacoes", valor: string) {
        if (!familia) {
            return
        }

        const familiaAtualizada: Familia = {
            ...familia,
            [field]: valor,
        }

        salvarFamiliaAtualizada(familiaAtualizada)
    }

    function handleAdicionarMembro() {
        if (!familia) {
            return
        }

        const membroNovo: Familia["membros"][number] = {
            id: `membro-${Date.now()}`,
            nome: "Novo membro",
            responsavel: false,
            observacoes: "",
            ultimoDiscurso: undefined,
        }

        const familiaAtualizada: Familia = {
            ...familia,
            membros: [...familia.membros, membroNovo],
        }

        // save
        void salvarFamiliaAtualizada(familiaAtualizada)
    }

    function handleAtualizarMembro(membroId: string, campo: "nome" | "responsavel" | "observacoes", valor: string | boolean) {
        if (!familia) {
            return
        }

        const membrosAtualizados = familia.membros.map((membro) => {
            if (membro.id !== membroId) {
                return membro
            }

            if (campo === "responsavel" && typeof valor === "boolean") {
                return {
                    ...membro,
                    responsavel: valor,
                }
            }

            if (typeof valor === "string") {
                return {
                    ...membro,
                    [campo]: valor,
                }
            }

            return membro
        })

        const familiaAtualizada: Familia = {
            ...familia,
            membros: membrosAtualizados,
        }

        if (typeof valor === "boolean" && valor) {
            familiaAtualizada.membros = familiaAtualizada.membros.map((membro) => ({
                ...membro,
                responsavel: membro.id === membroId,
            }))
        }

        void salvarFamiliaAtualizada(familiaAtualizada)
    }

    function handleRemoverMembro(membroId: string) {
        if (!familia) {
            return
        }

        const familiaAtualizada: Familia = {
            ...familia,
            membros: familia.membros.filter((membro) => membro.id !== membroId),
        }

        void salvarFamiliaAtualizada(familiaAtualizada)
    }

    if (!password) {
        return <div>Senha não definida</div>
    }

    const inputStyle = {
        padding: "10px 12px",
        fontSize: 16,
        border: "1px solid var(--border-color)",
        borderRadius: 8,
        background: "transparent",
        color: "var(--input-text)",
        outline: "none",
    } as const

    const memberInputStyle = {
        ...inputStyle,
        padding: "8px 10px",
    } as const

    return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "sans-serif", padding: "32px 0" }}>
            <div style={{ width: "min(760px, 92vw)" }}>
                <PageHeader title={"Famílias"} basePath={basePath} />

                <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid var(--border-color)" }}>
                    <div style={{ textAlign: "center", margin: "0 0 20px" }}>
                        <Link href={`${basePath}/familias`}>Voltar para famílias</Link>
                    </div>

                    {!familia ? (
                        <p>Família não encontrada.</p>
                    ) : (
                        <div style={{ display: "grid", gap: 24 }}>
                            <section style={{ display: "grid", gap: 12, border: "1px solid var(--border-color)", padding: 16, borderRadius: 12 }}>
                                <h2 style={{ margin: 0, textAlign: "center" }}>Dados da família</h2>

                                <label style={{ display: "grid", gap: 6 }}>
                                    Nome da família
                                    <input
                                        value={familia.nome}
                                        onChange={(event) => handleFamiliaChange("nome", event.target.value)}
                                        style={inputStyle}
                                    />
                                </label>

                                {/* telefone e endereco removidos por solicitação */}
                                <label style={{ display: "grid", gap: 6 }}>
                                    Observações gerais
                                    <textarea
                                        value={familia.observacoes ?? ""}
                                        onChange={(event) => handleFamiliaChange("observacoes", event.target.value)}
                                        rows={4}
                                        style={{ ...inputStyle, resize: "vertical" }}
                                    />
                                </label>
                            </section>

                            <section style={{ display: "grid", gap: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                                    <h2 style={{ margin: 0 }}>Membros</h2>
                                    <button type="button" onClick={handleAdicionarMembro}>Adicionar membro</button>
                                </div>

                                {familia.membros.length === 0 ? (
                                    <p style={{ margin: 0, opacity: 0.8 }}>Nenhum membro cadastrado.</p>
                                ) : (
                                    familia.membros.map((membro) => {
                                        // compute last discurso for this member
                                        const discursos = carregarDiscursos(password)
                                        const porPessoa = discursos.filter(d => d.pessoaId === membro.id).slice().sort((a, b) => (a.data < b.data ? 1 : -1))
                                        const ultimo = porPessoa[0]
                                        function fmt(iso: string | undefined) {
                                            if (!iso) return ''
                                            const d = new Date(iso + 'T00:00:00')
                                            const dd = String(d.getDate()).padStart(2, '0')
                                            const mm = String(d.getMonth() + 1).padStart(2, '0')
                                            const yyyy = d.getFullYear()
                                            return `${dd}-${mm}-${yyyy}`
                                        }
                                        const totalDomingos = getUltimosDomingos().length
                                        const presentesUltimos3Meses = (membro as any).presencasUltimos3Meses ?? 0

                                        return (
                                            <div key={membro.id} style={{ display: "grid", gap: 10, border: "1px solid var(--border-color)", padding: 12, borderRadius: 12 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                                    <strong>{membro.nome || "Novo membro"}</strong>
                                                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(membro.responsavel)}
                                                            onChange={(event) => handleAtualizarMembro(membro.id, "responsavel", event.target.checked)}
                                                        />
                                                        Responsável
                                                    </label>
                                                </div>

                                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                                    <div style={{ minWidth: 160 }}>
                                                        <div style={{ fontSize: 13, opacity: 0.85 }}>Último discurso</div>
                                                        <div style={{ fontWeight: 700 }}>{ultimo ? `${fmt(ultimo.data)} — ${ultimo.tema || ''}` : '—'}</div>
                                                    </div>

                                                    <div style={{ minWidth: 140 }}>
                                                        <div style={{ fontSize: 13, opacity: 0.85 }}>Presenças (últimos 3 meses)</div>
                                                        <div style={{ fontWeight: 700 }}>{presentesUltimos3Meses}/{totalDomingos}</div>
                                                    </div>
                                                </div>

                                                <label style={{ display: "grid", gap: 6 }}>
                                                    Observações
                                                    <textarea
                                                        value={membro.observacoes ?? ""}
                                                        onChange={(event) => handleAtualizarMembro(membro.id, "observacoes", event.target.value)}
                                                        rows={3}
                                                        style={{ ...memberInputStyle, resize: "vertical" }}
                                                    />
                                                </label>

                                                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                                    <button type="button" onClick={() => handleRemoverMembro(membro.id)}>
                                                        Remover membro
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// Header replaced by shared PageHeader component
