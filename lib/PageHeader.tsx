"use client"

import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import { useState } from "react"

import { SettingsMenu } from "@/components/settings-menu"
import { useWardAccess } from "@/components/ward-access-guard"
import { sairDoFirebase } from "@/lib/firebase-auth"

export default function PageHeader() {
    const params = useParams()
    const pathname = usePathname()
    const { user, isAdmin } = useWardAccess()
    const [menuAberto, setMenuAberto] = useState(false)
    const passwordParam = params?.password
    const password = Array.isArray(passwordParam) ? passwordParam[0] : passwordParam
    const basePath = password ? `/ward/${encodeURIComponent(password)}` : "/ward"
    const links = [
        { href: `${basePath}/familias`, label: "Famílias" },
        { href: `${basePath}/datas`, label: "Domingos" },
        { href: `${basePath}/discursos`, label: "Discursos" },
        { href: `${basePath}/presenca`, label: "Presença" },
        ...(isAdmin ? [{ href: `${basePath}/acessos`, label: "Acessos" }] : []),
    ]

    return (
        <header className="page-header">
            <button
                type="button"
                className="page-header-menu-toggle"
                aria-label={menuAberto ? "Fechar menu de navegação" : "Abrir menu de navegação"}
                aria-expanded={menuAberto}
                aria-controls="ward-navigation"
                onClick={() => setMenuAberto((aberto) => !aberto)}
            >
                <span />
                <span />
                <span />
            </button>

            <nav
                id="ward-navigation"
                className={`page-header-nav${menuAberto ? " is-open" : ""}`}
                aria-label="Navegação da ala"
            >
                {links.map(({ href, label }) => {
                    const ativo = pathname === href || pathname.startsWith(`${href}/`)

                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`page-header-link${ativo ? " is-active" : ""}`}
                            aria-current={ativo ? "page" : undefined}
                            onClick={() => setMenuAberto(false)}
                        >
                            {label}
                        </Link>
                    )
                })}
            </nav>

            <SettingsMenu
                inline
                email={user?.email}
                onSignOut={() => void sairDoFirebase()}
            />
        </header>
    )
}
