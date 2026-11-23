"use client"

import {
    GoogleAuthProvider,
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    type User,
} from "firebase/auth"
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
} from "firebase/firestore"

import { getFirestoreInstance, initFirebase } from "./firestore"

export const BOOTSTRAP_ADMIN_UID = "P9PW6BPM5JbFRiIJYETYln7k4mm1"

function getFirebaseAuth() {
    initFirebase()
    return getAuth()
}

export function observeFirebaseUser(callback: (user: User | null) => void) {
    return onAuthStateChanged(getFirebaseAuth(), callback)
}

export async function entrarComGoogle() {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: "select_account" })
    const result = await signInWithPopup(getFirebaseAuth(), provider)
    return result.user
}

export async function entrarComEmail(email: string, password: string) {
    const result = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password)
    return result.user
}

export async function criarContaComEmail(email: string, password: string) {
    const result = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password)
    await sendEmailVerification(result.user)
    return result.user
}

export async function reenviarVerificacaoEmail(user: User) {
    await sendEmailVerification(user)
}

export async function recuperarSenha(email: string) {
    await sendPasswordResetEmail(getFirebaseAuth(), email.trim())
}

export async function atualizarStatusVerificacao(user: User) {
    await user.reload()
    return user
}

export async function sairDoFirebase() {
    await signOut(getFirebaseAuth())
}

export function isBootstrapAdmin(user: User | null) {
    return user?.uid === BOOTSTRAP_ADMIN_UID
}

export async function usuarioTemAcessoAWard(user: User, ward: string): Promise<boolean> {
    if (isBootstrapAdmin(user)) return true
    if (!user.email) return false

    const db = await getFirestoreInstance()
    const emailId = user.email.toLowerCase()
    const accessDoc = await getDoc(doc(db, "allowedUsers", emailId))
    const wards = accessDoc.data()?.wards
    return accessDoc.exists() && Array.isArray(wards) && wards.includes(ward)
}

export type UsuarioPermitido = {
    email: string
    wards: string[]
}

export type SolicitacaoAcesso = {
    id: string
    email: string
    wardId: string
    status: "pending" | "approved" | "rejected"
    createdAt?: string
}

export async function listarSolicitacoesAcesso(ward: string): Promise<SolicitacaoAcesso[]> {
    const db = await getFirestoreInstance()
    const snapshot = await getDocs(query(
        collection(db, "accessRequests"),
        where("wardId", "==", ward),
        where("status", "==", "pending"),
    ))

    return snapshot.docs.map((item) => {
        const data = item.data()
        return {
            id: item.id,
            email: String(data.email ?? ""),
            wardId: String(data.wardId ?? ward),
            status: data.status,
            createdAt: typeof data.createdAt === "string" ? data.createdAt : undefined,
        }
    })
}

export async function aprovarSolicitacaoAcesso(requestId: string, email: string, ward: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedWard = ward.trim().toLowerCase()
    const db = await getFirestoreInstance()
    const accessRef = doc(db, "allowedUsers", normalizedEmail)
    const accessSnapshot = await getDoc(accessRef)
    const wards = Array.isArray(accessSnapshot.data()?.wards) ? accessSnapshot.data()?.wards as string[] : []

    await setDoc(accessRef, {
        email: normalizedEmail,
        wards: [...new Set([...wards, normalizedWard])],
        updatedAt: serverTimestamp(),
    }, { merge: true })

    await updateDoc(doc(db, "accessRequests", requestId), {
        status: "approved",
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })
}

export async function rejeitarSolicitacaoAcesso(requestId: string): Promise<void> {
    const db = await getFirestoreInstance()
    await updateDoc(doc(db, "accessRequests", requestId), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })
}

export async function listarUsuariosPermitidos(): Promise<UsuarioPermitido[]> {
    const db = await getFirestoreInstance()
    const snapshot = await getDocs(collection(db, "allowedUsers"))
    return snapshot.docs
        .map((item) => ({
            email: String(item.data().email ?? item.id),
            wards: Array.isArray(item.data().wards) ? item.data().wards as string[] : [],
        }))
        .sort((a, b) => a.email.localeCompare(b.email))
}

export async function salvarUsuarioPermitido(email: string, wards: string[]): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedWards = [...new Set(wards.map((ward) => ward.trim().toLowerCase()).filter(Boolean))]
    if (!normalizedEmail || normalizedWards.length === 0) {
        throw new Error("Informe um email e pelo menos uma ward.")
    }

    const db = await getFirestoreInstance()
    await setDoc(doc(db, "allowedUsers", normalizedEmail), {
        email: normalizedEmail,
        wards: normalizedWards,
        updatedAt: serverTimestamp(),
    })
}

export async function removerUsuarioPermitido(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase()
    const currentUser = getAuth().currentUser
    if (currentUser && isBootstrapAdmin(currentUser) && currentUser.email?.toLowerCase() === normalizedEmail) {
        throw new Error("O administrador inicial não pode ser removido.")
    }

    const db = await getFirestoreInstance()
    await deleteDoc(doc(db, "allowedUsers", normalizedEmail))
}