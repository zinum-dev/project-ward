"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

import { type Familia } from "@/lib/familias"
import { carregarFamiliasFirestore } from "@/lib/firestore"

export default function FamiliasPage() {
    const params = useParams()
    const password = Array.isArray(params?.password) ? params.password[0] : params?.password
    const basePath = password ? `/ward/${password}` : "/ward"
    const [familias, setFamilias] = useState<Familia[]>([])
    const [erro, setErro] = useState("")

    useEffect(() => {
        let mounted = true
        carregarFamiliasFirestore(password).then((fams) => {
            if (mounted) setFamilias(fams)
        }).catch(() => {
            if (mounted) setErro("Não foi possível carregar as famílias do Firebase.")
        })

        return () => { mounted = false }
    }, [password])

    if (!password) {
        return <div>Senha não definida</div>
    }

    return (
        <div className="screen-content" style={{ fontFamily: "sans-serif" }}>
            <div style={{ width: "min(900px, 90vw)" }}>
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <Link className="outline-action" href={`${basePath}/familias/nova`}>Nova família</Link>
                </div>

                {erro && <p role="alert" style={{ textAlign: "center", color: "#b42318" }}>{erro}</p>}

                <div style={{ display: "grid", gap: 12, margin: "0 auto", width: "min(640px, 100%)" }}>
                    {familias.map((familia) => {
                        const responsavel = familia.membros.find((membro) => membro.responsavel) ?? familia.membros[0]

                        return (
                            <div
                                key={familia.id}
                                className="family-card"
                            >
                                <div>
                                    <div style={{ fontWeight: 700 }}>{responsavel?.nome ?? "-"}</div>
                                    <div style={{ fontSize: 13, opacity: 0.8 }}>{familia.membros.length} membros</div>
                                </div>

                                <div style={{ textAlign: "center" }}>{familia.nome}</div>

                                <Link className="outline-action" href={`${basePath}/familias/${familia.id}`}>Abrir</Link>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
