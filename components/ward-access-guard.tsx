"use client"

import type { User } from "firebase/auth"
import { useParams } from "next/navigation"
import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react"
import { FcGoogle } from "react-icons/fc"

import {
    atualizarStatusVerificacao,
    criarContaComEmail,
    entrarComGoogle,
    entrarComEmail,
    isBootstrapAdmin,
    observeFirebaseUser,
    recuperarSenha,
    reenviarVerificacaoEmail,
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
    const [status, setStatus] = useState<"checking" | "signed-out" | "unverified" | "denied" | "allowed" | "error">("checking")
    const [error, setError] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [authMode, setAuthMode] = useState<"sign-in" | "sign-up" | "reset">("sign-in")
    const [authMessage, setAuthMessage] = useState("")
    const [authBusy, setAuthBusy] = useState(false)

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

            if (!currentUser.emailVerified) {
                setStatus("unverified")
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

    async function handleEmailAuth(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError("")
        setAuthMessage("")
        setAuthBusy(true)
        try {
            if (authMode === "reset") {
                await recuperarSenha(email)
                setAuthMessage("Se houver uma conta com esse email, você receberá as instruções para redefinir a senha.")
            } else if (authMode === "sign-up") {
                await criarContaComEmail(email, password)
                setAuthMessage("Conta criada. Enviamos um link de verificação para seu email. Confirme-o antes de entrar.")
            } else {
                await entrarComEmail(email, password)
            }
        } catch (reason) {
            const code = typeof reason === "object" && reason !== null && "code" in reason
                ? String(reason.code)
                : ""
            const messages: Record<string, string> = {
                "auth/email-already-in-use": "Este email já tem uma conta. Entre ou recupere a senha.",
                "auth/invalid-credential": "Email ou senha incorretos.",
                "auth/invalid-email": "Informe um email válido.",
                "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente.",
                "auth/weak-password": "A senha deve ter pelo menos 6 caracteres.",
                "auth/user-disabled": "Esta conta foi desativada.",
                "auth/user-not-found": "Não encontramos uma conta com esse email.",
                "auth/wrong-password": "Email ou senha incorretos.",
            }
            setError(messages[code] ?? (reason instanceof Error ? reason.message : String(reason)))
        } finally {
            setAuthBusy(false)
        }
    }

    async function handleResendVerification() {
        if (!user) return
        setError("")
        setAuthMessage("")
        setAuthBusy(true)
        try {
            await reenviarVerificacaoEmail(user)
            setAuthMessage("Enviamos outro link de verificação. Confira sua caixa de entrada e spam.")
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason))
        } finally {
            setAuthBusy(false)
        }
    }

    async function handleRefreshVerification() {
        if (!user) return
        setError("")
        setAuthBusy(true)
        try {
            const refreshedUser = await atualizarStatusVerificacao(user)
            setUser(refreshedUser)
            if (refreshedUser.emailVerified) {
                setStatus("checking")
                const allowed = await usuarioTemAcessoAWard(refreshedUser, String(ward ?? ""))
                setStatus(allowed ? "allowed" : "denied")
            } else {
                setAuthMessage("O email ainda não foi confirmado. Abra o link enviado e tente novamente.")
            }
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason))
            setStatus("error")
        } finally {
            setAuthBusy(false)
        }
    }

    async function handleSignOut() {
        await sairDoFirebase()
    }

    if (status !== "allowed") {
        const message = status === "checking"
            ? "Verificando acesso..."
            : status === "unverified"
                ? "Confirme seu email para continuar. O link de verificação foi enviado pelo Firebase."
            : status === "denied"
                ? "Este email não está autorizado para esta ward. Solicite a liberação ao administrador."
                : status === "error"
                    ? "Não foi possível verificar o acesso."
                    : "Entre com sua conta autorizada."

        return (
            <>
                <SettingsMenu email={user?.email} onSignOut={user ? handleSignOut : undefined} />
                <main className="screen-content screen-content--standalone auth-screen" style={{ padding: 24 }}>
                    <section className="auth-panel">
                        <h1 style={{ margin: 0 }}>Acesso à ward</h1>
                        <p role="status" style={{ margin: 0 }}>{message}</p>
                        {error && <p role="alert" style={{ margin: 0, color: "#b42318" }}>{error}</p>}
                        {authMessage && <p role="status" style={{ margin: 0 }}>{authMessage}</p>}
                        {status === "signed-out" && (
                            <>
                                <form onSubmit={handleEmailAuth} className="auth-form">
                                    <label style={{ display: "grid", gap: 6 }}>
                                        Email
                                        <input
                                            type="email"
                                            autoComplete="email"
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            required
                                            style={{ width: "100%", padding: "10px 12px" }}
                                        />
                                    </label>
                                    {authMode !== "reset" && (
                                        <label style={{ display: "grid", gap: 6 }}>
                                            Senha
                                            <input
                                                type="password"
                                                autoComplete={authMode === "sign-up" ? "new-password" : "current-password"}
                                                value={password}
                                                onChange={(event) => setPassword(event.target.value)}
                                                minLength={6}
                                                required
                                                style={{ width: "100%", padding: "10px 12px" }}
                                            />
                                        </label>
                                    )}
                                    <div className={`auth-primary-actions${authMode === "sign-in" ? "" : " auth-primary-actions--single"}`}>
                                        <button type="submit" disabled={authBusy}>
                                            {authBusy
                                                ? "Aguarde..."
                                                : authMode === "sign-up"
                                                    ? "Criar conta"
                                                    : authMode === "reset"
                                                            ? "Recuperar senha"
                                                        : "Entrar com email"}
                                        </button>
                                        {authMode === "sign-in" && (
                                            <button type="button" className="google-sign-in" onClick={() => void handleGoogleSignIn()}>
                                                <FcGoogle aria-hidden="true" size={20} />
                                                <span>Entrar com Google</span>
                                            </button>
                                        )}
                                    </div>
                                </form>
                                <div className="auth-secondary-actions">
                                    {authMode === "sign-in" && (
                                        <>
                                            <button type="button" className="outline-action" onClick={() => { setAuthMode("reset"); setError(""); setAuthMessage("") }}>
                                                Esqueci a senha
                                            </button>
                                            <button type="button" className="outline-action" onClick={() => { setAuthMode("sign-up"); setError(""); setAuthMessage("") }}>
                                                Criar conta
                                            </button>
                                        </>
                                    )}
                                    {authMode === "sign-up" && (
                                        <button type="button" className="outline-action" onClick={() => { setAuthMode("sign-in"); setError(""); setAuthMessage("") }}>
                                            Voltar
                                        </button>
                                    )}
                                    {authMode === "reset" && (
                                        <button type="button" className="outline-action" onClick={() => { setAuthMode("sign-in"); setError(""); setAuthMessage("") }}>
                                            Voltar
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                        {status === "unverified" && (
                            <>
                                <button type="button" onClick={() => void handleRefreshVerification()} disabled={authBusy}>Já confirmei meu email</button>
                                <button type="button" className="outline-action" onClick={() => void handleResendVerification()} disabled={authBusy}>Reenviar verificação</button>
                            </>
                        )}
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