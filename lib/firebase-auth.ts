"use client"

import {
    GoogleAuthProvider,
    getAuth,
    onAuthStateChanged,
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
    serverTimestamp,
    setDoc,
} from "firebase/firestore"

import { getFirestoreInstance, initFirebase } from "./firestore"

export const BOOTSTRAP_ADMIN_EMAIL = "andre.zinum@gmail.com"

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

export async function sairDoFirebase() {
    await signOut(getFirebaseAuth())
}

export function isBootstrapAdmin(user: User | null) {
    return user?.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL
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
    if (normalizedEmail === BOOTSTRAP_ADMIN_EMAIL) {
        throw new Error("O administrador inicial não pode ser removido.")
    }

    const db = await getFirestoreInstance()
    await deleteDoc(doc(db, "allowedUsers", normalizedEmail))
}