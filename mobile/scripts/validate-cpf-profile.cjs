const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const profile = read("app/conta/editar-perfil.tsx");
const payment = read("app/checkout/pagamento.tsx");
const authStore = read("stores/authStore.ts");
const api = read("services/api.ts");
const cpf = read("lib/cpf.ts");

assert.ok(cpf.includes('replace(/\\D/g, "")'), "CPF não é normalizado para dígitos");
assert.ok(cpf.includes('/^(\\d)\\1{10}$/'), "Sequências repetidas de CPF não são rejeitadas");
assert.ok(profile.includes("isValidCpf(cpf)"), "Tela não valida CPF antes do envio");
assert.ok(profile.includes("cpf: normalizeCpf(cpf)"), "Tela não envia CPF normalizado");
assert.ok(profile.includes("cpfLocked"), "CPF já vinculado não está protegido contra alteração");
assert.ok(profile.includes("await setCustomer(updatedProfile)"), "Perfil atualizado não entra no estado/cache local");
assert.ok(authStore.includes('SecureStore.setItemAsync("ka-customer"'), "Perfil não persiste após reiniciar o app");
assert.ok(authStore.includes("cpf?: string | null"), "Tipo local do Customer não contém CPF");
assert.ok(payment.includes("customerApi") && payment.includes(".getMe()"), "Pagamento não busca o Customer no servidor");
assert.ok(payment.includes("setCpfReady(isValidCpf"), "Pagamento não valida o CPF atualizado");
assert.ok(payment.includes("await setCustomer(profile)"), "Pagamento não invalida o perfil local antigo");
assert.ok(api.includes('api.patch("/api/customers/me", data)'), "Endpoint PATCH real do perfil foi alterado indevidamente");
assert.ok(!profile.includes("supabase.from"), "Mobile tenta atualizar Customer diretamente no Supabase");

console.log("CPF mobile: 13/13 verificações aprovadas.");
