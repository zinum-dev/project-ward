'use client'

import { useRouter } from "next/navigation"
import { FormEvent, useRef, useState } from "react"
import ReCAPTCHA from "react-google-recaptcha"
import { SettingsMenu } from "@/components/settings-menu"

export default function Home() {
  const router = useRouter()
  const [ward, setWard] = useState("")
  const [solicitacaoAberta, setSolicitacaoAberta] = useState(false)
  const [emailSolicitacao, setEmailSolicitacao] = useState("")
  const [alaSolicitacao, setAlaSolicitacao] = useState("")
  const [captchaToken, setCaptchaToken] = useState("")
  const [mensagemSolicitacao, setMensagemSolicitacao] = useState("")
  const [solicitacaoEnviando, setSolicitacaoEnviando] = useState(false)
  const captchaRef = useRef<ReCAPTCHA>(null)
  const captchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const valor = ward.trim()
    if (!valor) {
      return
    }

    router.push(`/ward/${encodeURIComponent(valor)}`)
  }

  async function solicitarAcesso(event: FormEvent) {
    event.preventDefault()
    if (!captchaToken) {
      setMensagemSolicitacao("Confirme o reCAPTCHA antes de enviar.")
      return
    }

    setSolicitacaoEnviando(true)
    setMensagemSolicitacao("")

    try {
      const response = await fetch("/api/access-requests/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailSolicitacao, ward: alaSolicitacao, captchaToken }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Não foi possível enviar a solicitação.")

      setEmailSolicitacao("")
      setAlaSolicitacao("")
      setCaptchaToken("")
      captchaRef.current?.reset()
      setMensagemSolicitacao("Solicitação enviada. Aguarde a aprovação do administrador da ala.")
    } catch (reason) {
      setCaptchaToken("")
      captchaRef.current?.reset()
      setMensagemSolicitacao(reason instanceof Error ? reason.message : "Não foi possível enviar a solicitação.")
    } finally {
      setSolicitacaoEnviando(false)
    }
  }

  return (
    <div className="screen-content screen-content--standalone" style={{ fontFamily: "sans-serif" }}>
      <SettingsMenu />
      <main style={{ width: "min(420px, 90vw)", padding: 24 }}>
        <h1 style={{ marginBottom: 16 }}>Ward</h1>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label htmlFor="ward" style={{ display: "grid", gap: 6 }}>
            Encontre sua Ala, nao use acentos ou caracteres especiais.
            <input
              id="ward"
              value={ward}
              onChange={(event) => setWard(event.target.value)}
              placeholder="Ex: central"
              style={{ padding: "10px 12px", fontSize: 16 }}
            />
          </label>

          <button
            type="submit"
            disabled={!ward.trim()}
            style={{ padding: "10px 14px", fontSize: 16, cursor: ward.trim() ? "pointer" : "not-allowed" }}
          >
            Entrar
          </button>
        </form>

        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <button
            type="button"
            onClick={() => {
              setSolicitacaoAberta((aberta) => !aberta)
              setMensagemSolicitacao("")
            }}
          >
            Solicitar acesso
          </button>

          {solicitacaoAberta && (
            <section style={{ display: "grid", gap: 12, paddingTop: 12, borderTop: "1px solid var(--border-color)" }}>
              <form onSubmit={solicitarAcesso} style={{ display: "grid", gap: 12 }}>
                <label htmlFor="email-solicitacao" style={{ display: "grid", gap: 6 }}>
                  Gmail
                  <input
                    id="email-solicitacao"
                    type="email"
                    value={emailSolicitacao}
                    onChange={(event) => setEmailSolicitacao(event.target.value)}
                    placeholder="voce@gmail.com"
                    required
                    style={{ width: "100%", padding: "10px 12px", fontSize: 16 }}
                  />
                </label>
                <label htmlFor="ala-solicitacao" style={{ display: "grid", gap: 6 }}>
                  Ala desejada
                  <input
                    id="ala-solicitacao"
                    value={alaSolicitacao}
                    onChange={(event) => setAlaSolicitacao(event.target.value)}
                    placeholder="Ex: central"
                    maxLength={80}
                    required
                    style={{ width: "100%", padding: "10px 12px", fontSize: 16 }}
                  />
                </label>
                {captchaSiteKey ? (
                  <ReCAPTCHA
                    ref={captchaRef}
                    sitekey={captchaSiteKey}
                    onChange={(token) => setCaptchaToken(token ?? "")}
                    onExpired={() => setCaptchaToken("")}
                  />
                ) : (
                  <p role="alert" style={{ margin: 0 }}>reCAPTCHA ainda não está configurado.</p>
                )}
                <button type="submit" disabled={solicitacaoEnviando || !captchaSiteKey || !captchaToken}>
                  {solicitacaoEnviando ? "Enviando..." : "Enviar solicitação"}
                </button>
              </form>

              {mensagemSolicitacao && (
                <p role="status" style={{ margin: 0, textAlign: "center" }}>{mensagemSolicitacao}</p>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
