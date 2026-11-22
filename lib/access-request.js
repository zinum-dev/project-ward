export function normalizeEmail(email) {
    return String(email ?? "").trim().toLowerCase()
}

export function normalizeWard(ward) {
    return String(ward ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
}

export function validateAccessRequest(email, ward) {
    const normalizedEmail = normalizeEmail(email)
    const normalizedWard = normalizeWard(ward)
    if (!/^[^\s@]+@(gmail\.com|googlemail\.com)$/.test(normalizedEmail)) {
        return "Informe um endereço Gmail válido."
    }
    if (!normalizedWard) {
        return "Informe o nome da ala desejada."
    }
    if (normalizedWard.length > 80) {
        return "O nome da ala deve ter no máximo 80 caracteres."
    }
    return ""
}

export function isValidRecaptchaResponse(result, allowedHostnames) {
    return result?.success === true
        && typeof result.hostname === "string"
        && allowedHostnames.includes(result.hostname.toLowerCase())
}
