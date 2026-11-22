'use client'

import { useEffect, useRef, useState } from "react"
import { IoMdSettings } from "react-icons/io"

const THEME_KEY = "ward.theme"

type Theme = "dark" | "light"

type SettingsMenuProps = {
    inline?: boolean
    email?: string | null
    onSignOut?: () => void
}

export function SettingsMenu({ inline = false, email, onSignOut }: SettingsMenuProps) {
    const [menuAberto, setMenuAberto] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const savedTheme = window.localStorage.getItem(THEME_KEY)
        const systemPrefersLight = window.matchMedia("(prefers-color-scheme: light)").matches
        const resolvedTheme = savedTheme === "dark" || savedTheme === "light"
            ? savedTheme
            : systemPrefersLight
                ? "light"
                : "dark"

        document.documentElement.dataset.theme = resolvedTheme
    }, [])

    useEffect(() => {
        if (!menuAberto) return

        function handlePointerDown(event: PointerEvent) {
            if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
                setMenuAberto(false)
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") setMenuAberto(false)
        }

        document.addEventListener("pointerdown", handlePointerDown)
        document.addEventListener("keydown", handleKeyDown)

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown)
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [menuAberto])

    function toggleTheme() {
        const currentTheme: Theme = document.documentElement.dataset.theme === "light" ? "light" : "dark"
        const nextTheme: Theme = currentTheme === "dark" ? "light" : "dark"
        document.documentElement.dataset.theme = nextTheme
        window.localStorage.setItem(THEME_KEY, nextTheme)
    }

    return (
        <div className={`settings-menu${inline ? " settings-menu--inline" : ""}`} ref={menuRef}>
            <button
                type="button"
                className="settings-menu-toggle"
                aria-label={menuAberto ? "Fechar configurações" : "Abrir configurações"}
                aria-expanded={menuAberto}
                aria-controls="app-settings-panel"
                onClick={() => setMenuAberto((aberto) => !aberto)}
            >
                <IoMdSettings aria-hidden="true" />
            </button>

            {menuAberto && (
                <section id="app-settings-panel" className="settings-menu-panel" aria-label="Configurações">
                    {email && (
                        <div className="settings-account">
                            <span className="settings-menu-label">Conta conectada</span>
                            <strong>{email}</strong>
                        </div>
                    )}

                    <div className="settings-theme">
                        <span className="settings-menu-label">Aparência</span>
                        <button type="button" className="settings-theme-action" onClick={toggleTheme}>
                            <span className="settings-theme-light-action">Ativar modo claro</span>
                            <span className="settings-theme-dark-action">Ativar modo escuro</span>
                        </button>
                    </div>

                    {email && onSignOut && (
                        <button
                            type="button"
                            className="settings-sign-out"
                            onClick={() => {
                                setMenuAberto(false)
                                onSignOut()
                            }}
                        >
                            Sair da conta
                        </button>
                    )}
                </section>
            )}
        </div>
    )
}
