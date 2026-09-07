'use client'

import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"

export default function Home() {
  const router = useRouter()
  const [ward, setWard] = useState("")

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const valor = ward.trim()
    if (!valor) {
      return
    }

    router.push(`/ward/${encodeURIComponent(valor)}`)
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "sans-serif", padding: "32px 0" }}>
      <main style={{ width: "min(420px, 90vw)", padding: 24 }}>
        <h1 style={{ marginBottom: 16 }}>Ward</h1>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label htmlFor="ward" style={{ display: "grid", gap: 6 }}>
            Digite a ward
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
      </main>
    </div>
  )
}
