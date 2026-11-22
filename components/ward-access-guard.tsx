"use client"

import type { User } from "firebase/auth"
import { useParams } from "next/navigation"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

import {
    entrarComGoogle,
    isBootstrapAdmin,
    observeFirebaseUser,
    sairDoFirebase,
    usuarioTemAcessoAWard,
} from "@/lib/firebase-auth"
import { SettingsMenu } from "@/components/settings-menu"

type AccessContextValue = {
    user: User | null
    isAdmin: boolean
}

const AccessContext = createContext<AccessContextValue>({ user: null, isAdmin: false })

export function useWardAccess() {
    return useContext(AccessContext)
}

export default function WardAccessGuard({ children }: { children: ReactNode }) {
    const params = useParams()
    const wardParam = params?.password
    const ward = Array.isArray(wardParam) ? wardParam[0] : wardParam
    const [user, setUser] = useState<User | null>(null)
    const [status, setStatus] = useState<"checking" | "signed-out" | "denied" | "allowed" | "error">("checking")
    const [error, setError] = useState("")

    useEffect(() => {
        let active = true
        const unsubscribe = observeFirebaseUser((currentUser) => {
            if (!active) return
            setUser(currentUser)
            setError("")

            if (!currentUser) {
                setStatus("signed-out")
                return
            }

            setStatus("checking")
            usuarioTemAcessoAWard(currentUser, String(ward ?? "")).then((allowed) => {
                if (active) setStatus(allowed ? "allowed" : "denied")
            }).catch((reason: unknown) => {
                if (!active) return
                setError(reason instanceof Error ? reason.message : String(reason))
                setStatus("error")
            })
        })

        return () => {
            active = false
            unsubscribe()
        }
    }, [ward])

    async function handleGoogleSignIn() {
        setError("")
        try {
            await entrarComGoogle()
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason))
        }
    }

    async function handleSignOut() {
        await sairDoFirebase()
    }

    if (status !== "allowed") {
        const message = status === "checking"
            ? "Verificando acesso..."
            : status === "denied"
                ? "Este email não está autorizado para esta ward."
                : status === "error"
                    ? "Não foi possível verificar o acesso."
                    : "Entre com sua conta Google autorizada."

        return (
            <>
                <SettingsMenu email={user?.email} onSignOut={user ? handleSignOut : undefined} />
                <main className="screen-content screen-content--standalone" style={{ padding: 24 }}>
                    <section style={{ width: "min(420px, 100%)", display: "grid", gap: 16, textAlign: "center" }}>
                        <h1 style={{ margin: 0 }}>Acesso à ward</h1>
                        <p role="status" style={{ margin: 0 }}>{message}</p>
                        {error && <p role="alert" style={{ margin: 0, color: "#b42318" }}>{error}</p>}
                        {status === "signed-out" && <button type="button" onClick={() => void handleGoogleSignIn()}>Entrar com Google</button>}
                    </section>
                </main>
            </>
        )
    }

    const isAdmin = isBootstrapAdmin(user)

    return (
        <AccessContext.Provider value={{ user, isAdmin }}>
            {children}
        </AccessContext.Provider>
    )
}