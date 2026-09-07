'use client'

import { useEffect, useState } from "react"

const THEME_KEY = "ward.theme"

type Theme = "dark" | "light"

export function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>("dark")

    useEffect(() => {
        const savedTheme = window.localStorage.getItem(THEME_KEY)
        const systemPrefersLight = window.matchMedia("(prefers-color-scheme: light)").matches
        const resolvedTheme = savedTheme === "dark" || savedTheme === "light"
            ? savedTheme
            : systemPrefersLight
                ? "light"
                : "dark"

        setTheme(resolvedTheme)
        document.documentElement.dataset.theme = resolvedTheme
    }, [])

    function toggleTheme() {
        const nextTheme: Theme = theme === "dark" ? "light" : "dark"
        setTheme(nextTheme)
        document.documentElement.dataset.theme = nextTheme
        window.localStorage.setItem(THEME_KEY, nextTheme)
    }

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            style={{
                position: "fixed",
                top: 16,
                right: 16,
                zIndex: 1000,
                border: "1px solid var(--border-color)",
                borderRadius: 999,
                background: theme === "dark" ? "#ffffff" : "#111827",
                color: theme === "dark" ? "#111827" : "#ffffff",
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 14,
                boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            }}
        >
            {theme === "dark" ? "Claro" : "Escuro"}
        </button>
    )
}
