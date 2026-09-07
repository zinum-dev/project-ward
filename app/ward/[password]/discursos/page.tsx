'use client'

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import PageHeader from "@/lib/PageHeader"

import { getUltimosDomingos, carregarDiscursos, salvarDiscursos, adicionarDiscurso, removerDiscurso } from "@/lib/discursos"
import { carregarFamilias } from "@/lib/familias"
import { isFirestoreEnabled, carregarDiscursosFirestore, salvarDiscursosFirestore, carregarFamiliasFirestore } from "@/lib/firestore"

function formatDateDisplay(isoDate: string) {
    const d = new Date(isoDate + 'T00:00:00')
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}-${mm}-${yyyy}`
}

type Discurso = {
    id: string
    data: string
    nome: string
    tema?: string
}

export default function DiscursosPage() {
    const params = useParams()
    const password = Array.isArray(params?.password) ? params.password[0] : params?.password
    const basePath = password ? `/ward/${password}` : "/ward"

    const [discursos, setDiscursos] = useState<Discurso[]>([])
    const [filtro, setFiltro] = useState("")

    useEffect(() => {
        let mounted = true
        if (isFirestoreEnabled()) {
            carregarDiscursosFirestore(password).then((docs) => { if (mounted) setDiscursos(docs) }).catch(() => { if (mounted) setDiscursos([]) })
        } else {
            setDiscursos(carregarDiscursos(password))
        }

        return () => { mounted = false }
    }, [])

    const domingos = useMemo(() => getUltimosDomingos(new Date()).slice().reverse(), [])

    const [membros, setMembros] = useState<{ id: string; nome: string; familia: string }[]>([])

    useEffect(() => {
        let mounted = true
        if (isFirestoreEnabled()) {
            carregarFamiliasFirestore(password).then((fams) => {
                if (!mounted) return
                const list = fams.flatMap((f: any) => f.membros.map((m: any) => ({ ...m, familia: f.nome })))
                setMembros(list)
            }).catch(() => { if (mounted) setMembros([]) })
        } else {
            setMembros(carregarFamilias(password).flatMap(f => f.membros.map(m => ({ ...m, familia: f.nome }))))
        }

        return () => { mounted = false }
    }, [])

    function handleAdd(data: string, pessoaId: string, tema: string) {
        const membro = membros.find(m => m.id === pessoaId)
        if (!membro) return
        const proximo = adicionarDiscurso(discursos, { data, nome: membro.nome, tema, pessoaId })
        if (isFirestoreEnabled()) {
            void salvarDiscursosFirestore(proximo, password).catch(() => { })
        } else {
            salvarDiscursos(proximo, password)
        }
        setDiscursos(proximo)
    }

    const filterLower = filtro.trim().toLowerCase()

    return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "sans-serif", padding: "32px 0" }}>
            <div style={{ width: "min(760px, 92vw)" }}>
                <PageHeader title={"Discursos"} basePath={basePath} />

                <div style={{ marginBottom: 16, textAlign: "center" }}>
                    <input
                        type="text"
                        placeholder="Filtrar por nome ou tema"
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                        style={{ padding: 8, border: "1px solid var(--border-color)", background: "transparent", color: "var(--input-text)", width: "100%" }}
                    />
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                    {domingos.map((data: string) => {
                        const porData = discursos.filter((d) => d.data === data)
                        const visiveis = porData.filter(d => (
                            filterLower === "" || d.nome.toLowerCase().includes(filterLower) || (d.tema || "").toLowerCase().includes(filterLower)
                        ))

                        return (
                            <section key={data} className="discursos-section" style={{ border: "1px solid var(--border-color)", padding: 12, borderRadius: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                                    <strong>{formatDateDisplay(data)}</strong>
                                    <small>{porData.length} discursos</small>
                                </div>

                                <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                                    {visiveis.length === 0 ? <div style={{ opacity: 0.8 }}>Nenhum discurso filtrado.</div> : (
                                        visiveis.map((d) => (
                                            <div key={d.id} style={{ padding: 8, border: "1px solid var(--border-color)", borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>{d.nome}</div>
                                                    <div style={{ fontSize: 13, opacity: 0.85 }}>{d.tema}</div>
                                                </div>
                                                <div>
                                                    <button onClick={() => {
                                                        const proximo = removerDiscurso(discursos, d.id)
                                                        if (isFirestoreEnabled()) {
                                                            void salvarDiscursosFirestore(proximo, password).catch(() => { })
                                                        } else {
                                                            salvarDiscursos(proximo, password)
                                                        }
                                                        setDiscursos(proximo)
                                                    }} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}>Remover</button>
                                                </div>
                                            </div>
                                        ))
                                    )}

                                    {porData.length < 3 && (
                                        <AddForm
                                            data={data}
                                            existingCount={porData.length}
                                            membros={membros}
                                            onAdd={(pessoaId, tema) => handleAdd(data, pessoaId, tema)}
                                        />
                                    )}
                                </div>
                            </section>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function AddForm({ data, existingCount, onAdd, membros }: { data: string; existingCount: number; membros: { id: string; nome: string; familia: string }[]; onAdd: (pessoaId: string, tema: string) => void }) {
    const [selected, setSelected] = useState("")
    const [tema, setTema] = useState("")

    function submit(e: any) {
        e.preventDefault()
        if (!selected) return
        onAdd(selected, tema.trim())
        setSelected("")
        setTema("")
    }

    return (
        <form onSubmit={submit} style={{ display: "grid", gap: 8 }}>
            <div className="discursos-add-row" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select value={selected} onChange={e => setSelected(e.target.value)} style={{ flex: 1, padding: 8, border: "1px solid var(--border-color)", background: "transparent", color: "var(--input-text)", minWidth: 0 }}>
                    <option value="">Selecione um membro...</option>
                    {membros.map(m => (
                        <option key={m.id} value={m.id}>{m.nome} ({m.familia})</option>
                    ))}
                </select>
                <input className="discursos-input" value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Tema (opcional)" style={{ flex: 1, padding: 8, border: "1px solid var(--border-color)", background: "transparent", color: "var(--input-text)", minWidth: 0 }} />
                <button className="discursos-btn" type="submit" disabled={existingCount >= 3 || !selected} style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{existingCount >= 3 ? 'LIMITE' : 'Adicionar'}</button>
            </div>
        </form>
    )
}
