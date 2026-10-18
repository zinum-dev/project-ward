"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import PageHeader from "@/lib/PageHeader"
import { type Presenca } from "@/lib/familias"
import { carregarPresencaFirestore } from "@/lib/firestore"

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
    const [presencas, setPresencas] = useState<Presenca[]>([])
    const [erro, setErro] = useState("")

    useEffect(() => {
        let mounted = true
        if (!password) return () => { mounted = false }
        carregarPresencaFirestore(password).then((dados) => {
            if (mounted) setPresencas(dados)
        }).catch(() => {
            if (mounted) setErro("Não foi possível carregar as presenças do Firebase.")
        })
        return () => { mounted = false }
    }, [password])

    const datas = getUltimosDomingos()
    const contagemPorData = new Map<string, number>()

    for (const data of datas) {
        contagemPorData.set(data, new Set(
            presencas
                .filter((registro) => registro.data === data && registro.estado !== "estaca")
                .map((registro) => registro.pessoaId),
        ).size)
    }

    if (!password) return <div>Senha não definida</div>

    return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "sans-serif", padding: "32px 0" }}>
            <div style={{ width: "min(560px, 90vw)" }}>
                <PageHeader title={"Domingos"} basePath={basePath} />

                {erro && <p role="alert" style={{ color: "#b42318", textAlign: "center" }}>{erro}</p>}

                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                    {datas.map((data) => (
                        <li key={data} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                            <Link href={`${basePath}/datas/${data}`}>{formatDateDisplay(data)}</Link>
                            <span>{(contagemPorData.get(data) ?? 0)} pessoas marcadas</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
