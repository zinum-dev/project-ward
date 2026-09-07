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

async function getFirestoreInstance() {
    if (typeof window === "undefined") throw new Error("Firestore client only available in browser");
    initFirebase();
    return getFirestore();
}

// Convert Firestore per-date docs (id = ISO date, field `presentes: string[]`) to existing Presenca[] shape
export async function carregarPresencaFirestore(): Promise<Presenca[]> {
    if (!isFirestoreEnabled()) {
        // fallback to localStorage
        if (typeof window === "undefined") return [];
        try {
            const raw = window.localStorage.getItem(STORAGE_PRESENCA_KEY);
            return raw ? (JSON.parse(raw) as Presenca[]) : [];
        } catch {
            return [];
        }
    }

    const db = await getFirestoreInstance();
    const snapshot = await getDocs(collection(db, "presencas"));

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

    return resultado;
}

// Save the full Presenca[] to Firestore as docs per-date with `presentes: string[]`
export async function salvarPresencaFirestore(presencas: Presenca[]): Promise<void> {
    if (!isFirestoreEnabled()) {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(STORAGE_PRESENCA_KEY, JSON.stringify(presencas));
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

    const promises = Object.entries(porData).map(([data, presentes]) =>
        setDoc(doc(db, "presencas", data), {
            presentes,
            updatedAt: serverTimestamp(),
        })
    );

    await Promise.all(promises);
}

// Families: store one document per family under collection `familias`
export async function carregarFamiliasFirestore(): Promise<Familia[]> {
    if (!isFirestoreEnabled()) {
        if (typeof window === "undefined") return [];
        try {
            const raw = window.localStorage.getItem(STORAGE_FAMILIAS_KEY);
            return raw ? (JSON.parse(raw) as Familia[]) : [];
        } catch {
            return [];
        }
    }

    const db = await getFirestoreInstance();
    const snapshot = await getDocs(collection(db, "familias"));
    const resultado: Familia[] = [];
    snapshot.forEach((d) => {
        resultado.push(d.data() as Familia);
    });
    return resultado;
}

export async function salvarFamiliasFirestore(familias: Familia[]): Promise<void> {
    if (!isFirestoreEnabled()) {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(STORAGE_FAMILIAS_KEY, JSON.stringify(familias));
        return;
    }

    const db = await getFirestoreInstance();
    const promises = familias.map((f) => setDoc(doc(db, "familias", f.id), { ...f, updatedAt: serverTimestamp() }));
    await Promise.all(promises);
}

// Discursos: one document per discurso in collection `discursos`
export async function carregarDiscursosFirestore(): Promise<any[]> {
    if (!isFirestoreEnabled()) {
        if (typeof window === "undefined") return [];
        try {
            const raw = window.localStorage.getItem(STORAGE_DISCURSOS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    const db = await getFirestoreInstance();
    const snapshot = await getDocs(collection(db, "discursos"));
    const resultado: any[] = [];
    snapshot.forEach((d) => resultado.push({ id: d.id, ...(d.data() as any) }));
    return resultado;
}

export async function salvarDiscursosFirestore(lista: any[]): Promise<void> {
    if (!isFirestoreEnabled()) {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(STORAGE_DISCURSOS_KEY, JSON.stringify(lista));
        return;
    }

    const db = await getFirestoreInstance();
    const promises = lista.map((item) => setDoc(doc(db, "discursos", item.id), { ...item, updatedAt: serverTimestamp() }));
    await Promise.all(promises);
}

export default {
    isFirestoreEnabled,
    initFirebase,
    carregarPresencaFirestore,
    salvarPresencaFirestore,
};
