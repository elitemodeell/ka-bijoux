const { loadEnvConfig } = require("@next/env");
const { PrismaClient } = require("@prisma/client");
const { randomBytes } = require("node:crypto");

loadEnvConfig(process.cwd());

const BASE_URL = "https://kabijoux.com.br";
const prisma = new PrismaClient();
const results = [];
const startedAt = Date.now();
let testCustomerId = null;
let testEmail = null;

function record(name, passed, detail = "") {
  results.push({ name, passed: Boolean(passed), detail });
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      redirect: options.redirect ?? "follow",
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "KA-Bijoux-Production-Smoke/1.0",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers ?? {}),
      },
    });
    const contentType = response.headers.get("content-type") ?? "";
    let body = null;
    if (contentType.includes("application/json")) {
      body = await response.json().catch(() => null);
    } else {
      body = await response.text().catch(() => "");
    }
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

function firstPurchasableProduct(products) {
  for (const product of products) {
    const variation = (product.variations ?? []).find(
      (candidate) => Number(candidate.stock) > 0
    );
    if (variation) {
      return { productId: product.id, variationId: variation.id };
    }
    if (Number(product.stock) > 0) {
      return { productId: product.id };
    }
  }
  return null;
}

async function waitForResendEmail(recipient) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { found: false, accepted: false };

  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
    const response = await fetch("https://api.resend.com/emails", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      return { found: false, accepted: false };
    }
    const payload = await response.json();
    const email = (payload.data ?? []).find((candidate) => {
      const recipients = Array.isArray(candidate.to)
        ? candidate.to
        : [candidate.to];
      const timestamp = Date.parse(candidate.created_at ?? "");
      return (
        recipients.includes(recipient) &&
        Number.isFinite(timestamp) &&
        timestamp >= startedAt - 30_000
      );
    });
    if (email) {
      const rejected = new Set(["bounced", "failed", "suppressed"]);
      return {
        found: true,
        accepted: !rejected.has(String(email.last_event ?? "").toLowerCase()),
        senderMatches: String(email.from ?? "").includes("adm@kabijoux.com.br"),
        replyToMatches: (
          Array.isArray(email.reply_to) ? email.reply_to : [email.reply_to]
        )
          .filter(Boolean)
          .includes("adm@kabijoux.com.br"),
      };
    }
  }
  return { found: false, accepted: false };
}

async function run() {
  const home = await request("/");
  record(
    "home",
    home.response.status === 200 && String(home.body).includes("KA Bijoux"),
    `HTTP ${home.response.status}`
  );

  const productsPage = await request("/produtos");
  record("products_page", productsPage.response.status === 200, `HTTP ${productsPage.response.status}`);

  const cartPage = await request("/carrinho");
  record("cart_page", cartPage.response.status === 200, `HTTP ${cartPage.response.status}`);

  const adminLogin = await request("/admin/login");
  record("admin_login_page", adminLogin.response.status === 200, `HTTP ${adminLogin.response.status}`);

  const adminProtected = await request("/admin/dashboard", { redirect: "manual" });
  const adminLocation = adminProtected.response.headers.get("location") ?? "";
  record(
    "admin_protected",
    [302, 303, 307, 308].includes(adminProtected.response.status) &&
      adminLocation.includes("/admin/login"),
    `HTTP ${adminProtected.response.status}`
  );

  const categories = await request("/api/categories");
  record(
    "categories_api",
    categories.response.status === 200 &&
      Array.isArray(categories.body?.data) &&
      categories.body.data.length > 0,
    `HTTP ${categories.response.status}`
  );

  const products = await request("/api/products?pageSize=50&catalogLine=general");
  const productList = products.body?.data?.products ?? [];
  record(
    "products_api",
    products.response.status === 200 && productList.length > 0,
    `HTTP ${products.response.status}`
  );

  const methods = await request("/api/payments/methods");
  const methodNames = new Set(
    (methods.body?.data?.methods ?? []).map((item) => item.method)
  );
  record(
    "payment_methods",
    methods.response.status === 200 &&
      methodNames.has("PIX") &&
      methodNames.has("CREDIT_CARD") &&
      methodNames.has("BOLETO"),
    `HTTP ${methods.response.status}`
  );

  const invalidWebhook = await request("/api/webhooks/asaas", {
    method: "POST",
    body: JSON.stringify({}),
    headers: { "asaas-access-token": "invalid-production-smoke-token" },
  });
  record(
    "webhook_invalid_token",
    invalidWebhook.response.status === 401,
    `HTTP ${invalidWebhook.response.status}`
  );

  const suffix = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  testEmail = `adm+deploy-${suffix}@kabijoux.com.br`;
  const password = randomBytes(24).toString("base64url");

  const register = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "KA Bijoux Deploy Test",
      email: testEmail,
      phone: "37999999999",
      password,
      acceptedTerms: true,
    }),
  });
  testCustomerId = register.body?.data?.customer?.id ?? null;
  record(
    "customer_registration",
    register.response.status === 201 && Boolean(testCustomerId),
    `HTTP ${register.response.status}`
  );

  const login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: testEmail, password }),
  });
  const token = login.body?.data?.token ?? null;
  record(
    "customer_login",
    login.response.status === 200 && Boolean(token),
    `HTTP ${login.response.status}`
  );

  if (token) {
    const emptyCart = await request("/api/cart", {
      headers: bearer(token),
    });
    record("authenticated_cart", emptyCart.response.status === 200, `HTTP ${emptyCart.response.status}`);

    const selection = firstPurchasableProduct(productList);
    record("purchasable_product", Boolean(selection));

    if (selection) {
      const addCart = await request("/api/cart", {
        method: "POST",
        headers: bearer(token),
        body: JSON.stringify({ ...selection, quantity: 1 }),
      });
      record("cart_add", addCart.response.status === 200, `HTTP ${addCart.response.status}`);

      const shipping = await request("/api/shipping/calculate", {
        method: "POST",
        headers: bearer(token),
        body: JSON.stringify({ zipCode: "35680000" }),
      });
      const shippingOptions = shipping.body?.data ?? [];
      record(
        "store_pickup",
        shipping.response.status === 200 &&
          shippingOptions.some(
            (option) => option.id === "pickup" && option.available === true
          ),
        `HTTP ${shipping.response.status}`
      );
      record(
        "mototaxi",
        shipping.response.status === 200 &&
          shippingOptions.some(
            (option) => option.id === "mototaxi" && option.available === true
          ),
        `HTTP ${shipping.response.status}`
      );
    }

    const clearCart = await request("/api/cart", {
      method: "DELETE",
      headers: bearer(token),
    });
    record("cart_cleanup_api", clearCart.response.status === 200, `HTTP ${clearCart.response.status}`);
  }

  const recovery = await request("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: testEmail }),
  });
  record("password_recovery", recovery.response.status === 200, `HTTP ${recovery.response.status}`);

}

async function cleanup() {
  if (!testCustomerId) return;
  await prisma.$transaction([
    prisma.consentLog.deleteMany({ where: { customerId: testCustomerId } }),
    prisma.customer.deleteMany({
      where: { id: testCustomerId, email: testEmail },
    }),
  ]);
  const remaining = await prisma.customer.count({
    where: { id: testCustomerId },
  });
  record("test_data_removed", remaining === 0);
}

(async () => {
  try {
    await run();
  } catch (error) {
    record(
      "unhandled_smoke_error",
      false,
      error instanceof Error ? error.name : "unknown"
    );
  } finally {
    try {
      await cleanup();
    } catch (error) {
      record(
        "test_data_removed",
        false,
        error instanceof Error ? error.name : "unknown"
      );
    }
    await prisma.$disconnect();
  }

  for (const result of results) {
    console.log(
      `${result.name.toUpperCase()}=${result.passed ? "PASS" : "FAIL"}${
        result.detail ? `;${result.detail}` : ""
      }`
    );
  }
  const passed = results.filter((result) => result.passed).length;
  console.log(`SUMMARY=${passed}/${results.length}`);
  process.exitCode = passed === results.length ? 0 : 1;
})();
