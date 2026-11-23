'use client'

import { useParams } from "next/navigation"
import { useEffect, useMemo, useState, type FormEvent } from "react"

import { getUltimosDomingos, adicionarDiscurso, removerDiscurso, filtrarDiscursosPorNomeOuTema } from "@/lib/discursos"
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

    const [discursos, setDiscursos] = useState<Discurso[]>([])
    const [filtro, setFiltro] = useState("")

    useEffect(() => {
        let mounted = true
        if (isFirestoreEnabled()) {
            carregarDiscursosFirestore(password).then((docs) => { if (mounted) setDiscursos(docs) }).catch(() => { if (mounted) setDiscursos([]) })
        } else {
            setDiscursos([])
        }

        return () => { mounted = false }
    }, [password])

    const domingos = useMemo(() => getUltimosDomingos(new Date()).slice().reverse(), [])

    const [membros, setMembros] = useState<{ id: string; nome: string; familia: string }[]>([])
    const [erroFamilias, setErroFamilias] = useState("")

    useEffect(() => {
        let mounted = true
        carregarFamiliasFirestore(password).then((fams) => {
            if (!mounted) return
            const list = fams.flatMap((familia) => familia.membros.map((membro) => ({ ...membro, familia: familia.nome })))
            setMembros(list)
        }).catch(() => {
            if (mounted) setErroFamilias("Não foi possível carregar os membros do Firebase.")
        })

        return () => { mounted = false }
    }, [password])

    function handleAdd(data: string, pessoaId: string, tema: string) {
        const membro = membros.find(m => m.id === pessoaId)
        if (!membro) return
        const proximo = adicionarDiscurso(discursos, { data, nome: membro.nome, tema, pessoaId })
        if (isFirestoreEnabled()) {
            void salvarDiscursosFirestore(proximo, password).catch(() => { })
        }
        setDiscursos(proximo)
    }

    const filterLower = filtro.trim().toLowerCase()
    const discursosFiltrados = filtrarDiscursosPorNomeOuTema(discursos, filtro)
    const domingosVisiveis = filterLower
        ? domingos.filter((data) => discursosFiltrados.some((discurso) => discurso.data === data))
        : domingos

    return (
        <div className="screen-content" style={{ fontFamily: "sans-serif" }}>
            <div style={{ width: "min(760px, 92vw)" }}>
                <div style={{ marginBottom: 16, textAlign: "center" }}>
                    <input
                        type="text"
                        placeholder="Filtrar por nome ou tema"
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                        style={{ padding: 8, border: "1px solid var(--border-color)", background: "transparent", color: "var(--input-text)", width: "100%" }}
                    />
                </div>

                {erroFamilias && <p role="alert" style={{ textAlign: "center", color: "#b42318" }}>{erroFamilias}</p>}

                <div style={{ display: "grid", gap: 12 }}>
                    {domingosVisiveis.length === 0 ? (
                        <p style={{ textAlign: "center" }}>Nenhum domingo contém esse filtro.</p>
                    ) : domingosVisiveis.map((data: string) => {
                        const porData = discursos.filter((d) => d.data === data)
                        const visiveis = filterLower
                            ? discursosFiltrados.filter((discurso) => discurso.data === data)
                            : porData

                        return (
                            <section key={data} className="discursos-section" style={{ border: "1px solid var(--border-color)", padding: 12, borderRadius: 10 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                                    <strong>{formatDateDisplay(data)}</strong>
                                    <small>{filterLower ? visiveis.length : porData.length} discursos</small>
                                </div>

                                <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                                    {visiveis.length === 0 ? <div style={{ opacity: 0.8 }}>Nenhum discurso filtrado.</div> : (
                                        visiveis.map((d) => (
                                            <div key={d.id} className="discourse-card">
                                                <div className="discourse-card-info">
                                                    <div style={{ fontWeight: 700 }}>{d.nome}</div>
                                                    <div style={{ fontSize: 13, opacity: 0.85 }}>{d.tema}</div>
                                                </div>
                                                <div className="discourse-card-action">
                                                    <button onClick={() => {
                                                        const proximo = removerDiscurso(discursos, d.id)
                                                        if (isFirestoreEnabled()) {
                                                            void salvarDiscursosFirestore(proximo, password).catch(() => { })
                                                        }
                                                        setDiscursos(proximo)
                                                    }} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}>Remover</button>
                                                </div>
                                            </div>
                                        ))
                                    )}

                                    {!filterLower && porData.length < 3 && (
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
    const [memberSearch, setMemberSearch] = useState("")
    const [memberListOpen, setMemberListOpen] = useState(false)
    const [tema, setTema] = useState("")
    const membrosFiltrados = membros.filter((membro) =>
        `${membro.nome} ${membro.familia}`.toLocaleLowerCase().includes(memberSearch.trim().toLocaleLowerCase()),
    )

    function submit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!selected) return
        onAdd(selected, tema.trim())
        setSelected("")
        setMemberSearch("")
        setTema("")
    }

    return (
        <form onSubmit={submit} style={{ display: "grid", gap: 8 }}>
            <div className="discursos-add-row">
                <div
                    className="discursos-member-picker"
                    onBlur={(event) => {
                        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
                            setMemberListOpen(false)
                        }
                    }}
                >
                    <input
                        className="discursos-input"
                        type="text"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={memberListOpen}
                        aria-controls={`membros-${data}`}
                        value={memberSearch}
                        onFocus={() => setMemberListOpen(true)}
                        onChange={(event) => {
                            setMemberSearch(event.target.value)
                            setSelected("")
                            setMemberListOpen(true)
                        }}
                        onKeyDown={(event) => {
                            if (event.key === "Escape") setMemberListOpen(false)
                            if (event.key === "Enter" && memberListOpen && membrosFiltrados.length === 1) {
                                event.preventDefault()
                                setSelected(membrosFiltrados[0].id)
                                setMemberSearch(`${membrosFiltrados[0].nome} (${membrosFiltrados[0].familia})`)
                                setMemberListOpen(false)
                            }
                        }}
                        placeholder="Buscar membro por nome ou família..."
                        autoComplete="off"
                    />
                    {memberListOpen && (
                        <div id={`membros-${data}`} className="discursos-member-options" role="listbox" aria-label="Membros">
                            {membrosFiltrados.length > 0 ? membrosFiltrados.map((membro) => (
                                <button
                                    key={membro.id}
                                    type="button"
                                    role="option"
                                    aria-selected={selected === membro.id}
                                    className="discursos-member-option"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => {
                                        setSelected(membro.id)
                                        setMemberSearch(`${membro.nome} (${membro.familia})`)
                                        setMemberListOpen(false)
                                    }}
                                >
                                    {membro.nome} ({membro.familia})
                                </button>
                            )) : (
                                <p className="discursos-member-empty">Nenhum membro encontrado.</p>
                            )}
                        </div>
                    )}
                </div>
                <input className="discursos-input" value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Tema (opcional)" style={{ flex: 1, padding: 8, border: "1px solid var(--border-color)", background: "transparent", color: "var(--input-text)", minWidth: 0 }} />
                <button className="discursos-btn" type="submit" disabled={existingCount >= 3 || !selected} style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>{existingCount >= 3 ? 'LIMITE' : 'Adicionar'}</button>
            </div>
        </form>
    )
}
