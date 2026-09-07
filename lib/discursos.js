export function getUltimosDomingos(reference = new Date()) {
    const ref = new Date(reference);
    const start = new Date(ref);
    start.setMonth(start.getMonth() - 3);
    start.setHours(0, 0, 0, 0);

    // find first sunday on or after start
    const domingos = [];
    let cursor = new Date(start);
    // advance until sunday
    while (cursor.getDay() !== 0) {
        cursor.setDate(cursor.getDate() + 1);
    }

    while (cursor <= ref) {
        // skip first Sunday of each month (day 1..7)
        const dayOfMonth = cursor.getDate();
        if (dayOfMonth > 7) {
            domingos.push(cursor.toISOString().slice(0, 10));
        }

        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + 7);
    }

    // ensure at least some Sundays (safety)
    return domingos;
}

export function adicionarDiscurso(lista = [], novo) {
    // novo: { data: 'YYYY-MM-DD', nome, tema }
    const date = novo.data;

    // keep original order and limit per date to first 3 entries
    const resultados = [];
    const contadorPorData = {};

    for (const item of lista) {
        if (!contadorPorData[item.data]) contadorPorData[item.data] = 0;
        if (contadorPorData[item.data] < 3) {
            resultados.push(item);
            contadorPorData[item.data]++;
        }
    }

    // if the target date already has 3 or more, do not add the new one
    if ((contadorPorData[date] || 0) >= 3) {
        return resultados;
    }

    const novoItem = {
        id: `dis-${Date.now()}`,
        data: date,
        nome: novo.nome,
        tema: novo.tema ?? "",
        pessoaId: novo.pessoaId ?? "",
    };

    return [...resultados, novoItem];
}

export const STORAGE_DISCURSOS_KEY = 'ward.discursos';

export function carregarDiscursos() {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_DISCURSOS_KEY);
        if (!raw) return [];
        const dados = JSON.parse(raw);
        return Array.isArray(dados) ? dados : [];
    } catch {
        return [];
    }
}

export function salvarDiscursos(lista) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_DISCURSOS_KEY, JSON.stringify(lista));
}

export function removerDiscurso(lista = [], id) {
    return lista.filter((d) => d.id !== id);
}
