'use client'

import Link from "next/link"
import { useParams } from "next/navigation"

export default function PessoaDetalhePage() {
    const params = useParams()
    const password = Array.isArray(params?.password) ? params.password[0] : params?.password
    const id = Array.isArray(params?.id) ? params.id[0] : params?.id
    const basePath = password ? `/ward/${password}` : "/ward"

    if (!password) {
        return <div>Senha não definida</div>
    }

    return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "sans-serif", padding: "32px 0" }}>
            <div style={{ width: "min(560px, 90vw)" }}>
                <div style={{ textAlign: "center" }}>
                    <h1 style={{ margin: 0, paddingBottom: 8, borderBottom: "1px solid var(--border-color)", display: "inline-block" }}>Pessoa: {id || "não informada"}</h1>
                </div>

                <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid var(--border-color)" }}>
                    <div style={{ textAlign: "center", marginBottom: 20 }}>
                        <Link href={`${basePath}/pessoas`}>Voltar para pessoas</Link>
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                        <p>Nome: Maria da Silva</p>
                        <p>Telefone: (11) 99999-0000</p>
                        <p>Status: ativo</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
