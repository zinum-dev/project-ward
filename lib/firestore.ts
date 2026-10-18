import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    setDoc,
    serverTimestamp,
} from "firebase/firestore";
import { Presenca, Familia } from "./familias";
const STORAGE_DISCURSOS_KEY = "ward.discursos";

function localKey(base: string, ward?: string) {
    return ward && ward.trim().length > 0 ? `ward.${ward}.${base}` : `ward.${base}`
}

type FirebaseConfig = {
    apiKey: string;
    authDomain?: string;
    projectId: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
};

export function removerUndefined(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(removerUndefined);
    }
    if (value !== null && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, removerUndefined(item)])
        );
    }
    return value;
}

let app: FirebaseApp | null = null;

function hasFirebaseConfig(): boolean {
    return Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
}

export function isFirestoreEnabled(): boolean {
    // Require explicit opt-in plus project vars
    return process.env.NEXT_PUBLIC_FIRESTORE_ENABLED === "1" && hasFirebaseConfig();
}

export function initFirebase(): void {
    if (typeof window === "undefined") return; // only run in browser
    if (!isFirestoreEnabled()) return;
    if (getApps().length > 0) return;

    const config: FirebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    initializeApp(config);
}

export async function getFirestoreInstance() {
    if (typeof window === "undefined") throw new Error("Firestore client only available in browser");
    initFirebase();
    return getFirestore();
}

// Convert per-date status maps, including legacy arrays, into member records.
export async function carregarPresencaFirestore(ward?: string): Promise<Presenca[]> {
    if (!isFirestoreEnabled()) {
        return [];
    }

    const db = await getFirestoreInstance();
    const coll = ward ? collection(db, "wards", ward, "presencas") : collection(db, "presencas");
    const snapshot = await getDocs(coll);

    const resultado: Presenca[] = [];
    snapshot.forEach((d) => {
        const dados = d.data();
        const dataId = d.id; // expected ISO date
        const statusPorPessoa = dados.statusPorPessoa as Record<string, Presenca["estado"]> | undefined;

        if (statusPorPessoa && typeof statusPorPessoa === "object") {
            Object.entries(statusPorPessoa).forEach(([pessoaId, estado]) => {
                if (estado === "presente" || estado === "online" || estado === "estaca") {
                resultado.push({
                    id: `${dataId}-${pessoaId}`,
                    data: dataId,
                    pessoaId,
                    estado,
                });
                }
            });
            return;
        }

        const estadosLegados = [
            ["presente", dados.presentes],
            ["online", dados.online],
            ["estaca", dados.estaca],
        ] as const;
        estadosLegados.forEach(([estado, pessoas]) => {
            if (Array.isArray(pessoas)) {
                pessoas.forEach((pessoaId) => resultado.push({
                    id: `${dataId}-${pessoaId}`,
                    data: dataId,
                    pessoaId,
                    estado,
                }));
            }
        });
    });

    return resultado;
}

// Save attendance states in a person-id keyed map, one Firestore document per date.
export async function salvarPresencaFirestore(presencas: Presenca[], ward?: string, datasAtualizadas: string[] = []): Promise<void> {
    if (!isFirestoreEnabled()) {
        return;
    }

    const db = await getFirestoreInstance();

    const porData = new Map<string, Record<string, Presenca["estado"]>>();
    presencas.forEach(({ data, pessoaId, estado }) => {
        const statusPorPessoa = porData.get(data) ?? {};
        statusPorPessoa[pessoaId] = estado;
        porData.set(data, statusPorPessoa);
    });

    const datasParaSalvar = new Set([...porData.keys(), ...datasAtualizadas]);
    const promises = [...datasParaSalvar].map((data) => {
        const ref = ward ? doc(db, "wards", ward, "presencas", data) : doc(db, "presencas", data);
        return setDoc(ref, {
            statusPorPessoa: porData.get(data) ?? {},
            updatedAt: serverTimestamp(),
        })
    });

    await Promise.all(promises);
}

// Families: store one document per family under collection `familias`
export async function carregarFamiliasFirestore(ward?: string): Promise<Familia[]> {
    if (!isFirestoreEnabled()) {
        return [];
    }

    const db = await getFirestoreInstance();
    const coll = ward ? collection(db, "wards", ward, "familias") : collection(db, "familias");
    const snapshot = await getDocs(coll);
    const resultado: Familia[] = [];
    snapshot.forEach((d) => {
        resultado.push(d.data() as Familia);
    });

    return resultado;
}

export async function salvarFamiliaFirestore(familia: Familia, ward?: string): Promise<void> {
    if (!isFirestoreEnabled()) {
        throw new Error("Firestore is not enabled")
    }

    const db = await getFirestoreInstance();
    const ref = ward ? doc(db, "wards", ward, "familias", familia.id) : doc(db, "familias", familia.id);
    await setDoc(ref, { ...(removerUndefined(familia) as Familia), updatedAt: serverTimestamp() });
}

export async function salvarFamiliasFirestore(familias: Familia[], ward?: string): Promise<void> {
    if (!isFirestoreEnabled()) {
        console.warn('[firestore] Firestore desativado', {
            enabled: process.env.NEXT_PUBLIC_FIRESTORE_ENABLED,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        })
        return;
    }

    console.log('[firestore] iniciar salvarFamiliasFirestore', {
        ward,
        count: familias.length,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    })

    try {
        const db = await getFirestoreInstance();
        console.log('[firestore] instância recebida', !!db)

        const promises = familias.map((f) => {
            const ref = ward ? doc(db, "wards", ward, "familias", f.id) : doc(db, "familias", f.id);
            console.log('[firestore] preparando setDoc', { ward, docId: f.id, path: ref.path })
            return setDoc(ref, { ...(removerUndefined(f) as Familia), updatedAt: serverTimestamp() });
        });

        await Promise.all(promises);
        console.log('[firestore] setDoc concluído para todas as familias')
    } catch (error) {
        console.error('[firestore] falha ao salvar familias no Firestore', error)
        throw error
    }
}

// Discursos: one document per discurso in collection `discursos`
export async function carregarDiscursosFirestore(ward?: string): Promise<any[]> {
    if (!isFirestoreEnabled()) {
        return [];
    }

    const db = await getFirestoreInstance();
    const coll = ward ? collection(db, "wards", ward, "discursos") : collection(db, "discursos");
    const snapshot = await getDocs(coll);
    const resultado: any[] = [];
    snapshot.forEach((d) => resultado.push({ id: d.id, ...(d.data() as any) }));

    return resultado;
}

export async function salvarDiscursosFirestore(lista: any[], ward?: string): Promise<void> {
    if (!isFirestoreEnabled()) {
        return;
    }

    const db = await getFirestoreInstance();
    const promises = lista.map((item) => {
        const ref = ward ? doc(db, "wards", ward, "discursos", item.id) : doc(db, "discursos", item.id);
        return setDoc(ref, { ...item, updatedAt: serverTimestamp() });
    });
    await Promise.all(promises);
}

export default {
    isFirestoreEnabled,
    initFirebase,
    carregarPresencaFirestore,
    salvarPresencaFirestore,
    carregarFamiliasFirestore,
    salvarFamiliaFirestore,
    salvarFamiliasFirestore,
    carregarDiscursosFirestore,
    salvarDiscursosFirestore,
};
