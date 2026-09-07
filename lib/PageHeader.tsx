"use client"

import Link from "next/link"
import React from "react"

export default function PageHeader({ title, basePath }: { title: string; basePath: string }) {
    return (
        <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h1 style={{ margin: 0, paddingBottom: 8, borderBottom: "1px solid var(--border-color)", display: "inline-block" }}>{title}</h1>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-color)" }}>
                <div style={{ display: "grid", gap: 8, textAlign: "center" }}>
                    <Link href={`${basePath}/familias`}>Famílias</Link>
                    <Link href={`${basePath}/datas`}>Domingos</Link>
                    <Link href={`${basePath}/discursos`}>Discursos</Link>
                    <Link href={`${basePath}/presenca`}>Presença</Link>
                </div>
            </div>
        </div>
    )
}
