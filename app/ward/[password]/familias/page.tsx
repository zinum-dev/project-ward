'use client'

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

import { carregarFamilias, type Familia } from "@/lib/familias"

export default function FamiliasPage() {
    const params = useParams()
    const password = Array.isArray(params?.password) ? params.password[0] : params?.password
    const basePath = password ? `/ward/${password}` : "/ward"
    const [familias, setFamilias] = useState<Familia[]>([])

    useEffect(() => {
        setFamilias(carregarFamilias())
    }, [])

    if (!password) {
        return <div>Senha não definida</div>
    }

    return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "sans-serif" }}>
            <div style={{ width: "min(900px, 90vw)" }}>
                <Header basePath={basePath} />

                <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid #fff" }}>
                    <h2 style={{ textAlign: "center", marginBottom: 20 }}>Famílias</h2>
                    <div style={{ textAlign: "center", marginBottom: 16 }}>
                        <Link href={`${basePath}/familias/nova`}>Nova família</Link>
                    </div>

                    <div style={{ display: "grid", gap: 12, margin: "0 auto", width: "min(640px, 100%)" }}>
                        {familias.map((familia) => {
                            const responsavel = familia.membros.find((membro) => membro.responsavel) ?? familia.membros[0]

                            return (
                                <div
                                    key={familia.id}
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "1.3fr 1fr auto",
                                        gap: 12,
                                        alignItems: "center",
                                        border: "1px solid #fff",
                                        borderRadius: 8,
                                        padding: "12px 16px",
                                        background: "rgba(255,255,255,0.02)",
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{responsavel?.nome ?? "-"}</div>
                                        <div style={{ fontSize: 13, opacity: 0.8 }}>{familia.membros.length} membros</div>
                                    </div>

                                    <div style={{ textAlign: "center" }}>{familia.nome}</div>

                                    <Link href={`${basePath}/familias/${familia.id}`}>Abrir</Link>
                                </div>
                            )
                        })}
                    </div>
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
