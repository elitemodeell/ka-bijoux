const digits = (value) => String(value ?? "").replace(/\D/g, "");
const normalizedName = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} é obrigatório no gerenciador de segredos.`);
  return value;
};

async function jsonRequest(url, init) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`${url} respondeu HTTP ${response.status}.`);
  return response.json();
}

async function verifyAsaas() {
  if (required("ASAAS_ENVIRONMENT") !== "sandbox") throw new Error("ASAAS_ENVIRONMENT deve ser sandbox.");
  const headers = { access_token: required("ASAAS_API_KEY"), accept: "application/json", "User-Agent": "KA-Bijoux/sandbox-verification" };
  const [commercial, walletsPayload] = await Promise.all([
    jsonRequest("https://api-sandbox.asaas.com/v3/myAccount/commercialInfo/", { headers }),
    jsonRequest("https://api-sandbox.asaas.com/v3/wallets/", { headers }),
  ]);
  const wallets = Array.isArray(walletsPayload) ? walletsPayload : walletsPayload.data ?? [];
  if (normalizedName(commercial.companyName) !== normalizedName(required("ASAAS_EXPECTED_LEGAL_NAME")) ||
      digits(commercial.cpfCnpj) !== digits(required("ASAAS_EXPECTED_CPF_CNPJ")) ||
      !wallets.some((wallet) => (wallet.id ?? wallet.walletId) === required("ASAAS_EXPECTED_WALLET_ID"))) {
    throw new Error("A credencial sandbox Asaas não pertence à conta esperada da KA BIJOUX.");
  }
  return { accountIdentity: "verified", environment: "sandbox" };
}

async function verifyMelhorEnvio() {
  if (required("MELHOR_ENVIO_SANDBOX") !== "true") throw new Error("MELHOR_ENVIO_SANDBOX deve ser true.");
  const payload = JSON.parse(required("MELHOR_ENVIO_SANDBOX_TEST_PAYLOAD"));
  const rates = await jsonRequest("https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate", {
    method: "POST",
    headers: { Authorization: `Bearer ${required("MELHOR_ENVIO_TOKEN")}`, "Content-Type": "application/json",
      Accept: "application/json", "User-Agent": "KA-Bijoux/sandbox-verification" },
    body: JSON.stringify(payload),
  });
  if (!Array.isArray(rates) || !rates.some((rate) => Number(rate.price) > 0 || rate.error)) {
    throw new Error("Resposta sandbox do Melhor Envio não contém cotação reconhecível.");
  }
  return { quoteEndpoint: "verified", environment: "sandbox", services: rates.length };
}

Promise.all([verifyAsaas(), verifyMelhorEnvio()])
  .then(([asaas, melhorEnvio]) => console.log(JSON.stringify({ asaas, melhorEnvio })))
  .catch((error) => { console.error(error.message); process.exitCode = 1; });
