"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import PageHeader from "@/lib/PageHeader"

export default function Page() {
    const params = useParams()
    const password = Array.isArray(params?.password) ? params.password[0] : params?.password
    const basePath = password ? `/ward/${password}` : "/ward"

    if (!password) {
        return <div>Senha não definida</div>
    }

    return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "sans-serif", padding: "32px 0" }}>
            <div style={{ width: "min(560px, 90vw)" }}>
                <PageHeader title={"Pessoas"} basePath={basePath} />

                <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid var(--border-color)" }}>
                    <div style={{ display: "grid", gap: 8 }}>
                        <Link href={`${basePath}/pessoas/1`}>Pessoa - id</Link>
                        <Link href={`${basePath}/pessoas/nova`}>Nova pessoa</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}