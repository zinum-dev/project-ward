import test from 'node:test';
import assert from 'node:assert/strict';
import familias from './data/familias.json' with { type: 'json' };

test('deve ter pelo menos 5 familias iniciais', () => {
    assert.ok(Array.isArray(familias));
    assert.ok(familias.length >= 5);
});

test('todas as familias devem ter id, nome e membros', () => {
    for (const familia of familias) {
        assert.ok(familia.id);
        assert.ok(familia.nome);
        assert.ok(Array.isArray(familia.membros));
        assert.ok(familia.membros.length >= 1);
    }
});

test('cada membro da familia deve ter nome e pode ter observacoes', () => {
    for (const familia of familias) {
        for (const membro of familia.membros) {
            assert.ok(membro.id);
            assert.ok(membro.nome);
        }
    }
});
