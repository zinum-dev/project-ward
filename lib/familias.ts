
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
    estado: "presente" | "online" | "estaca";
};

export function gerarPessoaId() {
    return `pes-${crypto.randomUUID()}`;
}

export function slugify(valor: string) {
    return valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "sem-familia";
}

