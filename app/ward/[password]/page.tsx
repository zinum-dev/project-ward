'use client'

import Link from "next/link"
import { useParams } from "next/navigation"

export default function WardPage() {
    const params = useParams()
    const password = Array.isArray(params?.password) ? params.password[0] : params?.password

    if (!password) {
        return <div>Senha não definida</div>
    }

    const basePath = `/ward/${password}`

    return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "sans-serif" }}>
            <div style={{ width: "min(560px, 90vw)" }}>
                <div style={{ textAlign: "center" }}>
                    <h1 style={{ margin: 0, paddingBottom: 8, borderBottom: "1px solid #fff", display: "inline-block" }}>Ward: {password}</h1>
                </div>

                <div style={{ marginTop: 24, paddingTop: 12 }}>
                    <div style={{ display: "grid", gap: 12, textAlign: "center" }}>
                        <Link href={`${basePath}/pessoas`}>Pessoas</Link>
                        <Link href={`${basePath}/familias`}>Famílias</Link>
                        <Link href={`${basePath}/datas`}>Datas</Link>
                        <Link href={`${basePath}/presenca`}>Presença</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
