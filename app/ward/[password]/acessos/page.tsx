"use client"

import { FormEvent, useEffect, useState } from "react"
import { useParams } from "next/navigation"

import { useWardAccess } from "@/components/ward-access-guard"
import { listarUsuariosPermitidos, removerUsuarioPermitido, salvarUsuarioPermitido, type UsuarioPermitido } from "@/lib/firebase-auth"
import PageHeader from "@/lib/PageHeader"

export default function AcessosPage() {
    const params = useParams()
    const password = Array.isArray(params?.password) ? params.password[0] : params?.password
    const basePath = password ? `/ward/${password}` : "/ward"
    const { isAdmin } = useWardAccess()
    const [usuarios, setUsuarios] = useState<UsuarioPermitido[]>([])
    const [email, setEmail] = useState("")
    const [wards, setWards] = useState("")
    const [wardsEditadas, setWardsEditadas] = useState<Record<string, string>>({})
    const [erro, setErro] = useState("")
    const [salvando, setSalvando] = useState(false)

    async function carregarLista() {
        const lista = await listarUsuariosPermitidos()
        setUsuarios(lista)
        setWardsEditadas(Object.fromEntries(lista.map((usuario) => [usuario.email, usuario.wards.join(", ")])))
    }

    useEffect(() => {
        if (!isAdmin) return

        let active = true
        listarUsuariosPermitidos().then((lista) => {
            if (!active) return
            setUsuarios(lista)
            setWardsEditadas(Object.fromEntries(lista.map((usuario) => [usuario.email, usuario.wards.join(", ")])))
        }).catch((reason: unknown) => {
            if (active) setErro(reason instanceof Error ? reason.message : String(reason))
        })

        return () => { active = false }
    }, [isAdmin])

    function lerWards(valor: string) {
        return valor.split(/[\n,]/).map((ward) => ward.trim().toLowerCase()).filter(Boolean)
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setSalvando(true)
        setErro("")
        try {
            await salvarUsuarioPermitido(email, lerWards(wards))
            await carregarLista()
            setEmail("")
            setWards("")
        } catch (reason) {
            setErro(reason instanceof Error ? reason.message : String(reason))
        } finally {
            setSalvando(false)
        }
    }

    async function handleSave(usuarioEmail: string) {
        setErro("")
        try {
            await salvarUsuarioPermitido(usuarioEmail, lerWards(wardsEditadas[usuarioEmail] ?? ""))
            await carregarLista()
        } catch (reason) {
            setErro(reason instanceof Error ? reason.message : String(reason))
        }
    }

    async function handleRemove(usuarioEmail: string) {
        setErro("")
        try {
            await removerUsuarioPermitido(usuarioEmail)
            await carregarLista()
        } catch (reason) {
            setErro(reason instanceof Error ? reason.message : String(reason))
        }
    }

    if (!password) return <div>Ward não definida</div>
    if (!isAdmin) return <div>Acesso restrito ao administrador.</div>

    return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "32px 0" }}>
            <div style={{ width: "min(760px, 92vw)" }}>
                <PageHeader title="Acessos" basePath={basePath} />
                <main style={{ display: "grid", gap: 24 }}>
                    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
                        <h2 style={{ margin: 0 }}>Adicionar email</h2>
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="email@exemplo.com"
                            aria-label="Email"
                            required
                            style={{ padding: "10px 12px" }}
                        />
                        <label style={{ display: "grid", gap: 6 }}>
                            Wards autorizadas (separadas por vírgula)
                            <input
                                value={wards}
                                onChange={(event) => setWards(event.target.value)}
                                placeholder="galeao, central"
                                required
                                style={{ padding: "10px 12px" }}
                            />
                        </label>
                        <div><button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Adicionar acesso"}</button></div>
                    </form>

                    {erro && <p role="alert" style={{ margin: 0, color: "#b42318" }}>{erro}</p>}

                    <section style={{ display: "grid", gap: 12 }}>
                        <h2 style={{ margin: 0 }}>Emails autorizados</h2>
                        {usuarios.map((usuario) => (
                            <div key={usuario.email} style={{ display: "grid", gridTemplateColumns: "minmax(160px, 1fr) minmax(180px, 2fr) auto auto", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border-color)", padding: "10px 0" }}>
                                <strong style={{ overflowWrap: "anywhere" }}>{usuario.email}</strong>
                                <input
                                    aria-label={`Wards de ${usuario.email}`}
                                    value={wardsEditadas[usuario.email] ?? ""}
                                    onChange={(event) => setWardsEditadas((current) => ({ ...current, [usuario.email]: event.target.value }))}
                                    style={{ minWidth: 0, padding: "8px 10px" }}
                                />
                                <button type="button" onClick={() => void handleSave(usuario.email)}>Salvar</button>
                                <button type="button" onClick={() => void handleRemove(usuario.email)}>Remover</button>
                            </div>
                        ))}
                        {usuarios.length === 0 && <p style={{ margin: 0 }}>Nenhum email adicional cadastrado.</p>}
                    </section>
                </main>
            </div>
        </div>
    )
}