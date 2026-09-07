import { Presenca, carregarPresenca } from "./familias"
import { carregarDiscursos } from "./discursos"
import { isFirestoreEnabled, carregarPresencaFirestore, carregarDiscursosFirestore } from "./firestore"

// Generate last N Sundays (most recent first)
export function gerarUltimosNDomingos(n = 60, reference = new Date()): string[] {
    const ref = new Date(reference)
    ref.setHours(0, 0, 0, 0)

    // find previous (or same) sunday
    const diasAtras = ref.getDay() // 0 = Sunday
    const ultimoDomingo = new Date(ref)
    ultimoDomingo.setDate(ref.getDate() - diasAtras)

    const res: string[] = []
    for (let i = 0; i < n; i++) {
        const d = new Date(ultimoDomingo)
        d.setDate(ultimoDomingo.getDate() - i * 7)
        res.push(d.toISOString().slice(0, 10))
    }
    return res
}

// Count presences per pessoa over the last N Sundays
export async function contarPresencasPorPessoa(nDomingos = 60): Promise<Record<string, number>> {
    let presencas: Presenca[] = []
    if (isFirestoreEnabled()) {
        presencas = await carregarPresencaFirestore()
    } else {
        presencas = carregarPresenca()
    }

    const domingos = gerarUltimosNDomingos(nDomingos)
    const setDomingos = new Set(domingos)

    const mapa: Record<string, number> = {}
    for (const p of presencas) {
        if (!p.presente) continue
        if (!setDomingos.has(p.data)) continue
        mapa[p.pessoaId] = (mapa[p.pessoaId] || 0) + 1
    }

    return mapa
}

// Get discursos for a pessoa, supports Firestore or local
export async function getDiscursosPorPessoa(pessoaId: string) {
    if (isFirestoreEnabled()) {
        const docs = await carregarDiscursosFirestore()
        return docs.filter((d: any) => d.pessoaId === pessoaId)
    }

    return carregarDiscursos().filter((d) => d.pessoaId === pessoaId)
}

export default {
    gerarUltimosNDomingos,
    contarPresencasPorPessoa,
    getDiscursosPorPessoa,
}
