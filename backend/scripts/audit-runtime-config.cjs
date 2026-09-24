const loadLocal = process.argv.includes("--local");
const outputArgument = process.argv.find((argument) =>
  argument.startsWith("--output=")
);
const envFileArgument = process.argv.find((argument) =>
  argument.startsWith("--input-env-file=")
);

if (loadLocal) {
  require("@next/env").loadEnvConfig(process.cwd());
}
if (envFileArgument) {
  const fs = require("node:fs");
  const path = require("node:path");
  const envFilePath = path.resolve(
    process.cwd(),
    envFileArgument.slice("--input-env-file=".length)
  );
  for (const line of fs.readFileSync(envFilePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!match) continue;
    let parsed = match[2].trim();
    if (
      (parsed.startsWith('"') && parsed.endsWith('"')) ||
      (parsed.startsWith("'") && parsed.endsWith("'"))
    ) {
      parsed = parsed.slice(1, -1);
    }
    process.env[match[1]] = parsed.replace(/\\n/g, "\n");
  }
}

const names = [
  "PAYMENT_DEFAULT_PROVIDER",
  "PAYMENT_PROVIDER",
  "PAYMENT_PIX_PROVIDER",
  "PAYMENT_CARD_PROVIDER",
  "PAYMENT_BOLETO_PROVIDER",
  "ASAAS_ENVIRONMENT",
  "ASAAS_API_KEY",
  "ASAAS_EXPECTED_LEGAL_NAME",
  "ASAAS_EXPECTED_CPF_CNPJ",
  "ASAAS_EXPECTED_WALLET_ID",
  "ASAAS_WEBHOOK_TOKEN",
  "ASAAS_PIX_ENABLED",
  "ASAAS_CREDIT_CARD_ENABLED",
  "ASAAS_BOLETO_ENABLED",
  "ASAAS_MAX_INSTALLMENTS",
  "PAYMENT_PIX_DUE_DAYS",
  "PAYMENT_BOLETO_DUE_DAYS",
  "PAYMENT_CHECKOUT_EXPIRATION_MINUTES",
  "PAYMENT_CHECKOUT_RETURN_URL",
  "MELHOR_ENVIO_TOKEN",
  "MELHOR_ENVIO_SANDBOX",
];

function value(name) {
  return process.env[name]?.trim() ?? "";
}

function present(name) {
  return value(name).length > 0;
}

function classification(name) {
  const current = value(name);
  if (!current) return "absent";
  if (name === "ASAAS_API_KEY") {
    if (current.startsWith("$aact_prod_")) return "production-format";
    if (current.startsWith("$aact_hmlg_")) return "sandbox-format";
    return "unrecognized-format";
  }
  if (name === "ASAAS_WEBHOOK_TOKEN") {
    return current.length >= 32 && current.length <= 255
      ? "valid-length"
      : "invalid-length";
  }
  if (name === "ASAAS_EXPECTED_CPF_CNPJ") {
    return /^\d{14}$/.test(current.replace(/\D/g, ""))
      ? "valid-cnpj-shape"
      : "invalid-cnpj-shape";
  }
  if (name === "ASAAS_EXPECTED_WALLET_ID") {
    return current.length >= 8 && current.length <= 100
      ? "valid-length"
      : "invalid-length";
  }
  if (name === "PAYMENT_CHECKOUT_RETURN_URL") {
    try {
      return new URL(current).protocol === "https:"
        ? "valid-https"
        : "invalid-protocol";
    } catch {
      return "invalid-url";
    }
  }
  if (
    name.endsWith("_ENABLED") ||
    name === "MELHOR_ENVIO_SANDBOX"
  ) {
    return current === "true" || current === "false"
      ? "valid-boolean"
      : "invalid-boolean";
  }
  return "present";
}

const lines = names.map(
  (name) => `${name}:present=${present(name)};state=${classification(name)}`
);

const asaasEnvironment = value("ASAAS_ENVIRONMENT");
lines.push(
  `ASAAS_ENVIRONMENT_CLASS=${
    asaasEnvironment === "production" || asaasEnvironment === "sandbox"
      ? asaasEnvironment
      : asaasEnvironment
        ? "invalid"
        : "absent"
  }`
);

const keyState = classification("ASAAS_API_KEY");
lines.push(
  `ASAAS_KEY_MATCHES_ENVIRONMENT=${
    (asaasEnvironment === "production" && keyState === "production-format") ||
    (asaasEnvironment === "sandbox" && keyState === "sandbox-format")
  }`
);

const output = `${lines.join("\n")}\n`;
if (outputArgument) {
  const path = require("node:path");
  const fs = require("node:fs");
  const outputPath = path.resolve(
    process.cwd(),
    outputArgument.slice("--output=".length)
  );
  fs.writeFileSync(outputPath, output, { encoding: "utf8", mode: 0o600 });
} else {
  process.stdout.write(output);
}
