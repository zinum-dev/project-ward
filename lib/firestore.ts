import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    setDoc,
    serverTimestamp,
} from "firebase/firestore";
import { Presenca, STORAGE_PRESENCA_KEY, Familia, STORAGE_FAMILIAS_KEY } from "./familias";
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

// Convert Firestore per-date docs (id = ISO date, field `presentes: string[]`) to existing Presenca[] shape
export async function carregarPresencaFirestore(ward?: string): Promise<Presenca[]> {
    if (!isFirestoreEnabled()) {
        // fallback to localStorage
        if (typeof window === "undefined") return [];
        try {
            const raw = window.localStorage.getItem(localKey('presenca', ward));
            return raw ? (JSON.parse(raw) as Presenca[]) : [];
        } catch {
            return [];
        }
    }

    const db = await getFirestoreInstance();
    const coll = ward ? collection(db, "wards", ward, "presencas") : collection(db, "presencas");
    const snapshot = await getDocs(coll);

    const resultado: Presenca[] = [];
    snapshot.forEach((d) => {
        const presentes = (d.data() as any).presentes as string[] | undefined;
        const dataId = d.id; // expected ISO date
        if (Array.isArray(presentes)) {
            presentes.forEach((pessoaId) => {
                resultado.push({
                    id: `${dataId}-${pessoaId}`,
                    data: dataId,
                    pessoaId,
                    presente: true,
                });
            });
        }
    });

    // If remote has no data, try to seed from localStorage (useful on first-run)
    if (resultado.length === 0 && typeof window !== "undefined") {
        try {
            const raw = window.localStorage.getItem(localKey('presenca', ward));
            const local = raw ? (JSON.parse(raw) as Presenca[]) : [];
            if (Array.isArray(local) && local.length > 0) {
                // push local to firestore and return local
                await salvarPresencaFirestore(local, ward);
                return local;
            }
        } catch {
            // ignore and return empty
        }
    }

    return resultado;
}

// Save the full Presenca[] to Firestore as docs per-date with `presentes: string[]`
export async function salvarPresencaFirestore(presencas: Presenca[], ward?: string): Promise<void> {
    if (!isFirestoreEnabled()) {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(localKey('presenca', ward), JSON.stringify(presencas));
        return;
    }

    const db = await getFirestoreInstance();

    // group by date
    const porData = presencas.reduce<Record<string, string[]>>((acc, p) => {
        if (!p.presente) return acc;
        acc[p.data] = acc[p.data] || [];
        if (!acc[p.data].includes(p.pessoaId)) acc[p.data].push(p.pessoaId);
        return acc;
    }, {});

    const promises = Object.entries(porData).map(([data, presentes]) => {
        const ref = ward ? doc(db, "wards", ward, "presencas", data) : doc(db, "presencas", data);
        return setDoc(ref, {
            presentes,
            updatedAt: serverTimestamp(),
        })
    });

    await Promise.all(promises);
}

// Families: store one document per family under collection `familias`
export async function carregarFamiliasFirestore(ward?: string): Promise<Familia[]> {
    if (!isFirestoreEnabled()) {
        if (typeof window === "undefined") return [];
        try {
            const raw = window.localStorage.getItem(localKey('familias', ward));
            return raw ? (JSON.parse(raw) as Familia[]) : [];
        } catch {
            return [];
        }
    }

    const db = await getFirestoreInstance();
    const coll = ward ? collection(db, "wards", ward, "familias") : collection(db, "familias");
    const snapshot = await getDocs(coll);
    const resultado: Familia[] = [];
    snapshot.forEach((d) => {
        resultado.push(d.data() as Familia);
    });

    if (resultado.length === 0 && typeof window !== "undefined") {
        try {
            const raw = window.localStorage.getItem(localKey('familias', ward));
            const local = raw ? (JSON.parse(raw) as Familia[]) : [];
            if (Array.isArray(local) && local.length > 0) {
                // seed remote
                await salvarFamiliasFirestore(local, ward);
                return local;
            }
        } catch {
            // ignore
        }
    }
    return resultado;
}

export async function salvarFamiliasFirestore(familias: Familia[], ward?: string): Promise<void> {
    if (!isFirestoreEnabled()) {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(localKey('familias', ward), JSON.stringify(familias));
        return;
    }

    const db = await getFirestoreInstance();
    const promises = familias.map((f) => {
        const ref = ward ? doc(db, "wards", ward, "familias", f.id) : doc(db, "familias", f.id);
        return setDoc(ref, { ...f, updatedAt: serverTimestamp() });
    });
    await Promise.all(promises);
}

// Discursos: one document per discurso in collection `discursos`
export async function carregarDiscursosFirestore(ward?: string): Promise<any[]> {
    if (!isFirestoreEnabled()) {
        if (typeof window === "undefined") return [];
        try {
            const raw = window.localStorage.getItem(localKey('discursos', ward));
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    const db = await getFirestoreInstance();
    const coll = ward ? collection(db, "wards", ward, "discursos") : collection(db, "discursos");
    const snapshot = await getDocs(coll);
    const resultado: any[] = [];
    snapshot.forEach((d) => resultado.push({ id: d.id, ...(d.data() as any) }));

    if (resultado.length === 0 && typeof window !== "undefined") {
        try {
            const raw = window.localStorage.getItem(localKey('discursos', ward));
            const local = raw ? JSON.parse(raw) : [];
            if (Array.isArray(local) && local.length > 0) {
                await salvarDiscursosFirestore(local, ward);
                return local;
            }
        } catch {
            // ignore
        }
    }
    return resultado;
}

export async function salvarDiscursosFirestore(lista: any[], ward?: string): Promise<void> {
    if (!isFirestoreEnabled()) {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(localKey('discursos', ward), JSON.stringify(lista));
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
    salvarFamiliasFirestore,
    carregarDiscursosFirestore,
    salvarDiscursosFirestore,
};
