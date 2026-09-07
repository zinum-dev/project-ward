import test from 'node:test';
import assert from 'node:assert/strict';

import { adicionarDiscurso, getUltimosDomingos } from './lib/discursos.js';

test('deve gerar domingos dos ultimos 3 meses', () => {
    const domingos = getUltimosDomingos(new Date('2026-09-06T12:00:00'));

    assert.ok(Array.isArray(domingos));
    assert.ok(domingos.length >= 10);
    assert.ok(domingos.length <= 16);
    assert.ok(domingos.every((data) => new Date(`${data}T00:00:00`).getDay() === 0));
    assert.ok(domingos[0] <= domingos[domingos.length - 1]);
});

test('deve manter no maximo 3 discursos por domingo', () => {
    const atual = [
        { id: '1', data: '2026-09-06', nome: 'Ana', tema: 'Tema 1' },
        { id: '2', data: '2026-09-06', nome: 'Bia', tema: 'Tema 2' },
        { id: '3', data: '2026-09-06', nome: 'Caio', tema: 'Tema 3' },
        { id: '4', data: '2026-09-06', nome: 'Dani', tema: 'Tema 4' },
    ];

    const proximo = adicionarDiscurso(atual, { data: '2026-09-06', nome: 'Elias', tema: 'Tema 5' });

    assert.equal(proximo.length, 3);
    assert.equal(proximo[2].nome, 'Caio');
    assert.ok(proximo.some((item) => item.nome === 'Elias') === false);
});
