'use client'

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { FormEvent, useState } from "react"

import PageHeader from "@/lib/PageHeader"
import { gerarPessoaId, type Familia, type Pessoa } from "@/lib/familias"
import { salvarFamiliaFirestore } from "@/lib/firestore"

export default function NovaFamiliaPage() {
    const params = useParams()
    const router = useRouter()
    const password = Array.isArray(params?.password) ? params.password[0] : params?.password
    const basePath = password ? `/ward/${password}` : "/ward"
    const [form, setForm] = useState({
        nome: "",
        observacoes: "",
        membros: "",
    })
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState("")

    if (!password) {
        return <div>Senha não definida</div>
    }

    function handleChange(field: string, value: string) {
        setForm((atual) => ({ ...atual, [field]: value }))
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()
        setSalvando(true)
        setErro("")

        const membros = form.membros
            .split(/\n|,/)
            .map((linha) => linha.trim())
            .filter(Boolean)
            .map((nome, index) => ({
                id: gerarPessoaId(),
                nome,
                responsavel: index === 0,
                observacoes: "",
            } as Pessoa))

        const familia: Familia = {
            id: `fam-${Date.now()}`,
            nome: form.nome.trim(),
            observacoes: form.observacoes.trim(),
            membros: membros.length > 0 ? membros : [{ id: gerarPessoaId(), nome: form.nome.trim(), responsavel: true, observacoes: "" }],
        }

        try {
            console.log('[familia] iniciar salvamento', {
                password,
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                enabled: process.env.NEXT_PUBLIC_FIRESTORE_ENABLED,
                familiaId: familia.id,
            })

            await salvarFamiliaFirestore(familia, password)
            console.log('[familia] salvamento concluído com sucesso')

            router.push(`${basePath}/familias/${familia.id}`)
        } catch (error) {
            console.error('[familia] erro ao salvar', error)
            const message = error instanceof Error ? error.message : String(error)
            setErro(`Não foi possível salvar no Firebase. Detalhe: ${message}`)
            setSalvando(false)
        } finally {
            setSalvando(false)
        }
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

    return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "sans-serif", padding: "32px 0" }}>
            <div style={{ width: "min(760px, 92vw)" }}>
                <PageHeader title={"Famílias"} basePath={basePath} />

                <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid var(--border-color)" }}>
                    <div style={{ textAlign: "center", margin: "0 0 20px" }}>
                        <Link href={`${basePath}/familias`}>Voltar para famílias</Link>
                    </div>

                    <div style={{ display: "grid", gap: 24 }}>
                        <section style={{ display: "grid", gap: 12, border: "1px solid var(--border-color)", padding: 16, borderRadius: 12 }}>
                            <h2 style={{ margin: 0, textAlign: "center" }}>Nova família</h2>

                            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
                                <label style={{ display: "grid", gap: 6 }}>
                                    Nome da família
                                    <input
                                        value={form.nome}
                                        onChange={(event) => handleChange("nome", event.target.value)}
                                        required
                                        style={inputStyle}
                                    />
                                </label>

                                <label style={{ display: "grid", gap: 6 }}>
                                    Membros (um por linha ou separados por vírgula)
                                    <textarea
                                        value={form.membros}
                                        onChange={(event) => handleChange("membros", event.target.value)}
                                        rows={5}
                                        placeholder={"Maria Silva\nJoão Silva\nPedro Silva"}
                                        required
                                        style={{ ...inputStyle, resize: "vertical" }}
                                    />
                                </label>

                                <label style={{ display: "grid", gap: 6 }}>
                                    Observações gerais da família
                                    <textarea
                                        value={form.observacoes}
                                        onChange={(event) => handleChange("observacoes", event.target.value)}
                                        rows={4}
                                        style={{ ...inputStyle, resize: "vertical" }}
                                    />
                                </label>

                                <div style={{ display: "flex", justifyContent: "center" }}>
                                    <button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar família"}</button>
                                </div>
                                {erro && <p role="alert" style={{ margin: 0, color: "#b42318" }}>{erro}</p>}
                            </form>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Header replaced by shared PageHeader component
