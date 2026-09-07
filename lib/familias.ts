
export type Pessoa = {
    id: string;
    nome: string;
    responsavel?: boolean;
    observacoes?: string;
    ultimoDiscurso?: string;
    ultimoPresenca?: string;
    presencasUltimos3Meses?: number;
};

export type Familia = {
    id: string;
    nome: string;
    telefone?: string;
    endereco?: string;
    observacoes?: string;
    membros: Pessoa[];
};

export type Presenca = {
    id: string;
    data: string;
    pessoaId: string;
    presente: boolean;
};

export const STORAGE_FAMILIAS_KEY = "ward.familias";
export const STORAGE_PRESENCA_KEY = "ward.presenca";

function storageKey(base: string, ward?: string) {
    return ward && ward.trim().length > 0 ? `ward.${ward}.${base}` : `ward.${base}`
}

export const familiasIniciais: Familia[] = [];
export const presencaIniciais: Presenca[] = [];

export function slugify(valor: string) {
    return valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "sem-familia";
}

export function carregarFamilias(ward?: string): Familia[] {
    if (typeof window === "undefined") {
        return familiasIniciais;
    }

    try {
        const key = storageKey('familias', ward)
        const valorSalvo = window.localStorage.getItem(key);
        if (!valorSalvo) {
            return familiasIniciais;
        }

        const dados = JSON.parse(valorSalvo) as Familia[];
        return Array.isArray(dados) && dados.length > 0 ? dados : familiasIniciais;
    } catch {
        return familiasIniciais;
    }
}

export function salvarFamilias(familias: Familia[], ward?: string) {
    if (typeof window === "undefined") {
        return;
    }

    const key = storageKey('familias', ward)
    window.localStorage.setItem(key, JSON.stringify(familias));
}

export function carregarPresenca(ward?: string): Presenca[] {
    if (typeof window === "undefined") {
        return presencaIniciais;
    }

    try {
        const key = storageKey('presenca', ward)
        const valorSalvo = window.localStorage.getItem(key);
        if (!valorSalvo) {
            return presencaIniciais;
        }

        const dados = JSON.parse(valorSalvo) as Presenca[];
        return Array.isArray(dados) && dados.length > 0 ? dados : presencaIniciais;
    } catch {
        return presencaIniciais;
    }
}

export function salvarPresenca(presenca: Presenca[], ward?: string) {
    if (typeof window === "undefined") {
        return;
    }

    const key = storageKey('presenca', ward)
    window.localStorage.setItem(key, JSON.stringify(presenca));
}

export function getFamiliaPorId(id: string, ward?: string): Familia | undefined {
    return carregarFamilias(ward).find((familia) => familia.id === id);
}

export function carregarFamiliasEnriquecidas(ward?: string): Familia[] {
    const familias = carregarFamilias(ward);
    const presencas = carregarPresenca(ward);

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);

    return familias.map((familia) => ({
        ...familia,
        membros: familia.membros.map((membro) => {
            const registros = presencas.filter((p) => p.pessoaId === membro.id && p.presente);
            const ultimo = registros.length === 0 ? undefined : registros.slice().sort((a, b) => (a.data > b.data ? -1 : 1))[0].data;
            const contagem = registros.filter((r) => new Date(r.data) >= cutoff).length;

            return {
                ...membro,
                ultimoPresenca: ultimo,
                presencasUltimos3Meses: contagem,
            };
        }),
    }));
}
