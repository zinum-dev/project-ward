'use client'

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

export default function WardPage() {
    const params = useParams()
    const router = useRouter()
    const password = Array.isArray(params?.password) ? params.password[0] : params?.password

    useEffect(() => {
        if (password) {
            router.replace(`/ward/${encodeURIComponent(password)}/familias`)
        }
    }, [password, router])

    if (!password) {
        return <div>Senha não definida</div>
    }

    return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "sans-serif", padding: "32px 0" }}>
            <div style={{ width: "min(560px, 90vw)", textAlign: "center" }}>
                <h1 style={{ margin: 0, paddingBottom: 8, borderBottom: "1px solid var(--border-color)", display: "inline-block" }}>Ward: {password}</h1>
            </div>
        </div>
    )
}
