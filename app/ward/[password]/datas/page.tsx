'use client'

import Link from "next/link"
import { useParams } from "next/navigation"

import { carregarPresenca } from "@/lib/familias"

function getUltimosDomingos() {
    const hoje = new Date()
    const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
    const diaSemana = hojeSemHora.getDay()

    const ultimoDomingo = new Date(hojeSemHora)
    ultimoDomingo.setDate(hojeSemHora.getDate() - diaSemana)

    return Array.from({ length: 3 }, (_, index) => {
        const data = new Date(ultimoDomingo)
        data.setDate(ultimoDomingo.getDate() - index * 7)
        return data.toISOString().slice(0, 10)
    })
}

function formatDateDisplay(isoDate: string) {
    const d = new Date(isoDate + 'T00:00:00')
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}-${mm}-${yyyy}`
}

export default function DatasPage() {
    const params = useParams()
    const password = Array.isArray(params?.password) ? params.password[0] : params?.password
    const basePath = password ? `/ward/${password}` : "/ward"

    if (!password) {
        return <div>Senha não definida</div>
    }

    const datas = getUltimosDomingos()
    const presencas = carregarPresenca()
    const contagemPorData = new Map<string, number>()

    for (const data of datas) {
        contagemPorData.set(data, presencas.filter((registro) => registro.data === data && registro.presente).length)
    }

    return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "sans-serif", padding: "32px 0" }}>
            <div style={{ width: "min(560px, 90vw)" }}>
                <div style={{ textAlign: "center" }}>
                    <h1 style={{ margin: 0, paddingBottom: 8, borderBottom: "1px solid var(--border-color)", display: "inline-block" }}>Datas</h1>
                </div>

                <div style={{ marginTop: 20, paddingTop: 12, borderTop: "1px solid var(--border-color)" }}>
                    <div style={{ display: "grid", gap: 12, textAlign: "center", marginBottom: 20 }}>
                        <Link href={`${basePath}/familias`}>Famílias</Link>
                        <Link href={`${basePath}/datas`}>Datas</Link>
                        <Link href={`${basePath}/discursos`}>Discursos</Link>
                        <Link href={`${basePath}/presenca`}>Presença</Link>
                    </div>

                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                        {datas.map((data) => (
                            <li key={data} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                <Link href={`${basePath}/datas/${data}`}>{formatDateDisplay(data)}</Link>
                                <span>{(contagemPorData.get(data) ?? 0)} presentes</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}
