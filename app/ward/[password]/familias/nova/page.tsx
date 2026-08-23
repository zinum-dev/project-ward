'use client'

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { FormEvent, useState } from "react"

import { carregarFamilias, salvarFamilias, slugify, type Familia, type Pessoa } from "@/lib/familias"

export default function NovaFamiliaPage() {
    const params = useParams()
    const router = useRouter()
    const password = Array.isArray(params?.password) ? params.password[0] : params?.password
    const basePath = password ? `/ward/${password}` : "/ward"

    const [form, setForm] = useState({
        nome: "",
        telefone: "",
        endereco: "",
        observacoes: "",
        membros: "",
    })

    if (!password) {
        return <div>Senha não definida</div>
    }

    function handleChange(field: string, value: string) {
        setForm((atual) => ({ ...atual, [field]: value }))
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault()

        const membros = form.membros
            .split(/\n|,/)
            .map((linha) => linha.trim())
            .filter(Boolean)
            .map((nome, index) => ({
                id: `pes-${Date.now()}-${index + 1}`,
                nome,
                responsavel: index === 0,
                observacoes: "",
            } as Pessoa))

        const familia: Familia = {
            id: `fam-${Date.now()}`,
            nome: form.nome.trim(),
            telefone: form.telefone.trim(),
            endereco: form.endereco.trim(),
            observacoes: form.observacoes.trim(),
            membros: membros.length > 0 ? membros : [{ id: `pes-${Date.now()}-1`, nome: form.nome.trim(), responsavel: true, observacoes: "" }],
        }

        const familias = carregarFamilias()
        salvarFamilias([...familias, familia])
        router.push(`${basePath}/familias/${slugify(familia.nome)}`)
    }

    return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "sans-serif" }}>
            <div style={{ width: "min(520px, 90vw)" }}>
                <Header basePath={basePath} />

                <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid #fff" }}>
                    <h2 style={{ textAlign: "center", marginBottom: 20 }}>Nova família</h2>
                    <div style={{ textAlign: "center", marginBottom: 16 }}>
                        <Link href={`${basePath}/familias`}>Voltar para famílias</Link>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, maxWidth: 420, margin: "0 auto" }}>
                        <label>
                            Nome da família
                            <input value={form.nome} onChange={(event) => handleChange("nome", event.target.value)} required />
                        </label>

                        <label>
                            Telefone
                            <input value={form.telefone} onChange={(event) => handleChange("telefone", event.target.value)} />
                        </label>

                        <label>
                            Endereço
                            <input value={form.endereco} onChange={(event) => handleChange("endereco", event.target.value)} />
                        </label>

                        <label>
                            Membros (um por linha ou separados por vírgula)
                            <textarea value={form.membros} onChange={(event) => handleChange("membros", event.target.value)} rows={5} placeholder="Maria Silva\nJoão Silva\nPedro Silva" required />
                        </label>

                        <label>
                            Observações gerais da família
                            <textarea value={form.observacoes} onChange={(event) => handleChange("observacoes", event.target.value)} rows={4} />
                        </label>

                        <button type="submit">Salvar família</button>
                    </form>
                </div>
            </div>
        </div>
    )
}

function Header({ basePath }: { basePath: string }) {
    return (
        <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h1 style={{ margin: 0, paddingBottom: 8, borderBottom: "1px solid #fff", display: "inline-block" }}>Ward</h1>
            <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
                <Link href={`${basePath}/pessoas`}>Pessoas</Link>
                <Link href={`${basePath}/familias`}>Famílias</Link>
                <Link href={`${basePath}/datas`}>Datas</Link>
                <Link href={`${basePath}/presenca`}>Presença</Link>
            </div>
        </div>
    )
}
