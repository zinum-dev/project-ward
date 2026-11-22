import test from "node:test"
import assert from "node:assert/strict"

import {
    isValidRecaptchaResponse,
    normalizeEmail,
    normalizeWard,
    validateAccessRequest,
} from "./lib/access-request.js"

test("normaliza email e nome da ala", () => {
    assert.equal(normalizeEmail("  Usuario@GMAIL.COM "), "usuario@gmail.com")
    assert.equal(normalizeWard("  Ala São José  "), "ala-sao-jose")
})

test("rejeita email ou ala vazios", () => {
    assert.match(validateAccessRequest("email-invalido", "central"), /Gmail válido/)
    assert.match(validateAccessRequest("usuario@gmail.com", ""), /ala desejada/)
    assert.match(validateAccessRequest("usuario@example.com", "central"), /Gmail válido/)
})

test("aceita solicitação válida", () => {
    assert.equal(validateAccessRequest("usuario@gmail.com", "Ala Central"), "")
})

test("aceita apenas respostas reCAPTCHA válidas do hostname permitido", () => {
    assert.equal(isValidRecaptchaResponse({ success: true, hostname: "ward.example.com" }, ["ward.example.com"]), true)
    assert.equal(isValidRecaptchaResponse({ success: false, hostname: "ward.example.com" }, ["ward.example.com"]), false)
    assert.equal(isValidRecaptchaResponse({ success: true, hostname: "evil.example.com" }, ["ward.example.com"]), false)
    assert.equal(isValidRecaptchaResponse({}, ["ward.example.com"]), false)
})
