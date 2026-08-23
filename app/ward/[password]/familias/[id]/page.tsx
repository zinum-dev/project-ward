'use client'

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

import { carregarFamilias, type Familia } from "@/lib/familias"

export default function FamiliaDetalhePage() {
    const params = useParams()
    const password = Array.isArray(params?.password) ? params.password[0] : params?.password
    const id = Array.isArray(params?.id) ? params.id[0] : params?.id
    const basePath = password ? `/ward/${password}` : "/ward"
    const [familia, setFamilia] = useState<Familia | undefined>(undefined)

    useEffect(() => {
        if (!id) {
            setFamilia(undefined)
            return
        }

        setFamilia(carregarFamilias().find((item) => item.id === id))
    }, [id])

    function handleAdicionarMembro() {
        if (!familia) {
            return
        }

        const nome = window.prompt("Nome do novo membro da família:")
        if (!nome || !nome.trim()) {
            return
        }

        const familiaAtualizada: Familia = {
            ...familia,
            membros: [
                ...familia.membros,
                {
                    id: `pes-${Date.now()}`,
                    nome: nome.trim(),
                    responsavel: false,
                    observacoes: "",
                },
            ],
        }

        const familias = carregarFamilias()
        const listaAtualizada = familias.map((item) => (item.id === familiaAtualizada.id ? familiaAtualizada : item))

        localStorage.setItem("ward.familias", JSON.stringify(listaAtualizada))
        setFamilia(familiaAtualizada)
    }

    if (!password) {
        return <div>Senha não definida</div>
    }

    return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "sans-serif" }}>
            <div style={{ width: "min(600px, 90vw)" }}>
                <Header basePath={basePath} />

                <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid #fff" }}>
                    <div style={{ textAlign: "center", margin: "0 0 20px" }}>
                        <Link href={`${basePath}/familias`}>Voltar para famílias</Link>
                    </div>

                    {!familia ? (
                        <p>Família não encontrada.</p>
                    ) : (
                        <div>
                            <h2 style={{ textAlign: "center", marginBottom: 20 }}>{familia.nome}</h2>

                            <div style={{ display: "grid", gap: 8 }}>
                                <p>Telefone: {familia.telefone ?? "-"}</p>
                                <p>Endereço: {familia.endereco ?? "-"}</p>
                                <p>Observações: {familia.observacoes || "Sem observações gerais"}</p>
                                <p>Membros: {familia.membros.length}</p>
                            </div>

                            <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
                                <button type="button" onClick={handleAdicionarMembro}>Adicionar membro</button>
                            </div>

                            <ul style={{ paddingLeft: 20, margin: 0, display: "grid", gap: 8 }}>
                                {familia.membros.map((membro) => (
                                    <li key={membro.id}>
                                        <strong>{membro.nome}</strong>
                                        {membro.responsavel ? " (responsável)" : ""}
                                        {membro.observacoes ? ` - ${membro.observacoes}` : ""}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
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
