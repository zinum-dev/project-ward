import { getApps, initializeApp, cert } from "firebase-admin/app"
import { getFirestore, FieldValue } from "firebase-admin/firestore"

import { isValidRecaptchaResponse, normalizeEmail, normalizeWard, validateAccessRequest } from "@/lib/access-request"

export const runtime = "nodejs"

const attemptsByEmail = new Map<string, number[]>()

function getAdminDb() {
    if (!getApps().length) {
        const projectId = process.env.FIREBASE_PROJECT_ID
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

        if (projectId && clientEmail && privateKey) {
            initializeApp({
                credential: cert({ projectId, clientEmail, privateKey }),
            })
        } else {
            throw new Error("Credenciais administrativas do Firebase não configuradas.")
        }
    }
    return getFirestore()
}

function isLimited(email: string, ip: string) {
    const key = `${email}:${ip}`
    const now = Date.now()
    const recent = (attemptsByEmail.get(key) ?? []).filter((timestamp) => now - timestamp < 60 * 60 * 1000)
    if (recent.length >= 5) return true
    attemptsByEmail.set(key, [...recent, now])
    return false
}

export async function POST(request: Request) {
    let body: { email?: string; ward?: string; captchaToken?: string } | null
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Dados inválidos." }, { status: 400 })
    }
    if (!body || typeof body !== "object") {
        return Response.json({ error: "Dados inválidos." }, { status: 400 })
    }

    const email = normalizeEmail(body.email)
    const wardId = normalizeWard(body.ward)
    const captchaToken = String(body.captchaToken ?? "")
    const validationError = validateAccessRequest(email, wardId)
    if (validationError) return Response.json({ error: validationError }, { status: 400 })
    if (!captchaToken || captchaToken.length > 4096) {
        return Response.json({ error: "Confirme o reCAPTCHA antes de enviar." }, { status: 400 })
    }

    const captchaSecret = process.env.RECAPTCHA_SECRET_KEY
    const allowedHostnames = (process.env.RECAPTCHA_ALLOWED_HOSTNAMES ?? "")
        .split(",")
        .map((hostname) => hostname.trim().toLowerCase())
        .filter(Boolean)
    if (!captchaSecret || allowedHostnames.length === 0) {
        return Response.json({ error: "reCAPTCHA não está configurado no servidor." }, { status: 503 })
    }

    try {
        const captchaResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ secret: captchaSecret, response: captchaToken }),
            cache: "no-store",
        })
        if (!captchaResponse.ok) {
            throw new Error(`reCAPTCHA verification failed with status ${captchaResponse.status}`)
        }

        const captchaResult: unknown = await captchaResponse.json()
        if (!isValidRecaptchaResponse(captchaResult, allowedHostnames)) {
            return Response.json({ error: "Não foi possível validar o reCAPTCHA." }, { status: 400 })
        }

        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
        if (isLimited(email, ip)) {
            return Response.json({ error: "Muitas solicitações. Tente novamente mais tarde." }, { status: 429 })
        }

        const requestId = crypto.randomUUID()
        const db = getAdminDb()
        await db.collection("accessRequests").doc(requestId).set({
            email,
            wardId,
            status: "pending",
            createdAt: new Date().toISOString(),
            captchaVerified: true,
            updatedAt: FieldValue.serverTimestamp(),
        })

        return Response.json({ requestId })
    } catch (error) {
        console.error("Falha ao registrar solicitação de acesso:", error)
        return Response.json({ error: "Não foi possível registrar a solicitação." }, { status: 500 })
    }
}
