import test from "node:test"
import assert from "node:assert/strict"

import { getUltimosDomingos } from "./lib/domingos.js"

test("lista os domingos dos três meses do calendário, incluindo o mês atual", () => {
    const domingos = getUltimosDomingos(new Date(2026, 10, 23))

    assert.equal(domingos[0], "2026-11-22")
    assert.equal(domingos.at(-1), "2026-09-06")
    assert.equal(domingos.length, 12)
    assert.ok(domingos.every((data) => new Date(`${data}T00:00:00`).getDay() === 0))
    assert.ok(domingos.every((data, index) => index === 0 || data < domingos[index - 1]))
})
