'use client'

import Link from "next/link"
import { useParams } from "next/navigation"

export default function Page() {
    const params = useParams()
    const password = Array.isArray(params?.password) ? params.password[0] : params?.password
    const basePath = password ? `/ward/${password}` : "/ward"

    if (!password) {
        return <div>Senha não definida</div>
    }

    return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "sans-serif" }}>
            <div style={{ width: "min(560px, 90vw)" }}>
                <div style={{ textAlign: "center" }}>
                    <h1 style={{ margin: 0, paddingBottom: 8, borderBottom: "1px solid #fff", display: "inline-block" }}>Pessoas</h1>
                </div>

                <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid #fff" }}>
                    <div style={{ display: "grid", gap: 12, textAlign: "center", marginBottom: 20 }}>
                        <Link href={`${basePath}/pessoas`}>Pessoas</Link>
                        <Link href={`${basePath}/familias`}>Famílias</Link>
                        <Link href={`${basePath}/datas`}>Datas</Link>
                        <Link href={`${basePath}/presenca`}>Presença</Link>
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                        <Link href={`${basePath}/pessoas/1`}>Pessoa - id</Link>
                        <Link href={`${basePath}/pessoas/nova`}>Nova pessoa</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}