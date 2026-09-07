import familiasIniciaisData from "@/data/familias.json";
import presencaIniciaisData from "@/data/presenca.json";

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

export const familiasIniciais = familiasIniciaisData as Familia[];
export const presencaIniciais = presencaIniciaisData as Presenca[];

export function slugify(valor: string) {
    return valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "sem-familia";
}

export function carregarFamilias(): Familia[] {
    if (typeof window === "undefined") {
        return familiasIniciais;
    }

    try {
        const valorSalvo = window.localStorage.getItem(STORAGE_FAMILIAS_KEY);
        if (!valorSalvo) {
            return familiasIniciais;
        }

        const dados = JSON.parse(valorSalvo) as Familia[];
        return Array.isArray(dados) && dados.length > 0 ? dados : familiasIniciais;
    } catch {
        return familiasIniciais;
    }
}

export function salvarFamilias(familias: Familia[]) {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(STORAGE_FAMILIAS_KEY, JSON.stringify(familias));
}

export function carregarPresenca(): Presenca[] {
    if (typeof window === "undefined") {
        return presencaIniciais;
    }

    try {
        const valorSalvo = window.localStorage.getItem(STORAGE_PRESENCA_KEY);
        if (!valorSalvo) {
            return presencaIniciais;
        }

        const dados = JSON.parse(valorSalvo) as Presenca[];
        return Array.isArray(dados) && dados.length > 0 ? dados : presencaIniciais;
    } catch {
        return presencaIniciais;
    }
}

export function salvarPresenca(presenca: Presenca[]) {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(STORAGE_PRESENCA_KEY, JSON.stringify(presenca));
}

export function getFamiliaPorId(id: string): Familia | undefined {
    return carregarFamilias().find((familia) => familia.id === id);
}

export function carregarFamiliasEnriquecidas(): Familia[] {
    const familias = carregarFamilias();
    const presencas = carregarPresenca();

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
