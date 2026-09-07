import { Familia } from "./familias"
import { isFirestoreEnabled, getFirestoreInstance } from "./firestore"

const STORAGE_PESSOAS_KEY = "ward.pessoas"

export type PessoaDoc = {
    id: string
    nome: string
    familiaId?: string
    responsavel?: boolean
    observacoes?: string
    ultimoDiscurso?: string
    ultimoPresenca?: string
}

export function carregarPessoasLocal(): PessoaDoc[] {
    if (typeof window === "undefined") return []
    try {
        const raw = window.localStorage.getItem(STORAGE_PESSOAS_KEY)
        return raw ? (JSON.parse(raw) as PessoaDoc[]) : []
    } catch {
        return []
    }
}

export function salvarPessoasLocal(lista: PessoaDoc[]) {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_PESSOAS_KEY, JSON.stringify(lista))
}

export async function carregarPessoasFirestore(): Promise<PessoaDoc[]> {
    if (!isFirestoreEnabled()) return carregarPessoasLocal()
    const db = await getFirestoreInstance()
    const { collection, getDocs } = await import("firebase/firestore")
    const snap = await getDocs(collection(db, "pessoas"))
    const res: PessoaDoc[] = []
    snap.forEach((d) => res.push({ id: d.id, ...(d.data() as any) }))
    return res
}

export async function salvarPessoasFirestore(lista: PessoaDoc[]): Promise<void> {
    if (!isFirestoreEnabled()) {
        salvarPessoasLocal(lista)
        return
    }
    const db = await getFirestoreInstance()
    const { doc, setDoc } = await import("firebase/firestore")
    const promises = lista.map((p) => setDoc(doc(db, "pessoas", p.id), { ...p, updatedAt: new Date() }))
    await Promise.all(promises)
}

export function familiasParaPessoas(familias: Familia[]): PessoaDoc[] {
    const res: PessoaDoc[] = []
    for (const f of familias) {
        for (const m of f.membros) {
            res.push({
                id: m.id,
                nome: m.nome,
                familiaId: f.id,
                responsavel: m.responsavel,
                observacoes: m.observacoes,
                ultimoDiscurso: (m as any).ultimoDiscurso,
                ultimoPresenca: (m as any).ultimoPresenca,
            })
        }
    }
    return res
}

export async function upsertPessoasFromFamilia(familia: Familia): Promise<void> {
    const pessoas = familia.membros.map((m) => ({
        id: m.id,
        nome: m.nome,
        familiaId: familia.id,
        responsavel: m.responsavel,
        observacoes: m.observacoes,
        ultimoDiscurso: (m as any).ultimoDiscurso,
        ultimoPresenca: (m as any).ultimoPresenca,
    }))

    if (isFirestoreEnabled()) {
        await salvarPessoasFirestore(pessoas)
    } else {
        // merge with existing local list
        const atual = carregarPessoasLocal()
        const mapa: Record<string, PessoaDoc> = {}
        for (const p of atual) mapa[p.id] = p
        for (const p of pessoas) mapa[p.id] = p
        salvarPessoasLocal(Object.values(mapa))
    }
}

export default {
    carregarPessoasLocal,
    salvarPessoasLocal,
    carregarPessoasFirestore,
    salvarPessoasFirestore,
    familiasParaPessoas,
    upsertPessoasFromFamilia,
}
