'use client'

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

import { carregarFamiliasFirestore, carregarPresencaFirestore } from "@/lib/firestore"

function formatDateDisplay(isoDate: string) {
    const d = new Date(isoDate + 'T00:00:00')
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}-${mm}-${yyyy}`
}

export default function DataDetalhePage() {
    const params = useParams()
    const password = Array.isArray(params?.password) ? params.password[0] : params?.password
    const data = Array.isArray(params?.data) ? params.data[0] : params?.data
    const basePath = password ? `/ward/${password}` : "/ward"
    const [presentes, setPresentes] = useState<Array<{ id: string; nome: string; estado: "presente" | "online" | "estaca" }>>([])
    const [erro, setErro] = useState("")

    useEffect(() => {
        let mounted = true
        if (!password) return () => { mounted = false }

        Promise.all([carregarFamiliasFirestore(password), carregarPresencaFirestore(password)]).then(([familias, registros]) => {
            if (!mounted) return
            const mapaNomePorId = new Map(
                familias.flatMap((familia) => familia.membros.map((membro) => [membro.id, membro.nome] as [string, string])),
            )
            setPresentes(registros
                .filter((registro) => registro.data === data)
                .map((registro) => ({
                    id: registro.pessoaId,
                    nome: mapaNomePorId.get(registro.pessoaId) ?? "Pessoa sem nome",
                    estado: registro.estado,
                })))
        }).catch(() => {
            if (mounted) setErro("Não foi possível carregar os dados do Firebase.")
        })

        return () => { mounted = false }
    }, [data, password])

    if (!password) {
        return <div>Senha não definida</div>
    }

    return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "sans-serif", padding: "32px 0" }}>
            <div style={{ width: "min(560px, 90vw)" }}>
                <div style={{ textAlign: "center" }}>
                    <h1 style={{ margin: 0, paddingBottom: 8, borderBottom: "1px solid var(--border-color)", display: "inline-block" }}>Data: {data ? formatDateDisplay(data) : "não informada"}</h1>
                </div>

                <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid var(--border-color)" }}>
                    <div style={{ textAlign: "center", marginBottom: 20 }}>
                        <Link href={`${basePath}/datas`}>Voltar para datas</Link>
                    </div>

                    <p style={{ textAlign: "center", marginBottom: 16 }}>Presentes marcados:</p>

                    {erro && <p role="alert" style={{ textAlign: "center", color: "#b42318" }}>{erro}</p>}

                    {presentes.length === 0 ? (
                        <p style={{ textAlign: "center" }}>Nenhuma pessoa marcada como presente.</p>
                    ) : (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8, textAlign: "center" }}>
                            {presentes.map((pessoa) => (
                                <li key={pessoa.id}>{pessoa.nome} ({pessoa.estado})</li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}
