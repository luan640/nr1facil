const { chromium } = require("playwright");

const DEFAULTS = {
  baseUrl: process.env.BOT_BASE_URL || "http://localhost:5173",
  email: process.env.BOT_EMAIL || "luan640@gmail.com",
  password: process.env.BOT_PASSWORD || "12345678",
  headless: false, // process.env.BOT_HEADLESS !== "false",
  intervalMs: Number(process.env.BOT_INTERVAL_MS || 300000),
  once: false,
};

function parseArgs(argv) {
  const config = { ...DEFAULTS };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case "--once":
        config.once = true;
        break;
      case "--show-browser":
        config.headless = false;
        break;
      case "--headless":
        config.headless = true;
        break;
      case "--interval-ms":
        config.intervalMs = Number(next);
        index += 1;
        break;
      case "--base-url":
        config.baseUrl = next;
        index += 1;
        break;
      case "--email":
        config.email = next;
        index += 1;
        break;
      case "--password":
        config.password = next;
        index += 1;
        break;
      default:
        if (arg.startsWith("--")) {
          throw new Error(`Argumento nao suportado: ${arg}`);
        }
    }
  }

  if (!Number.isFinite(config.intervalMs) || config.intervalMs <= 0) {
    throw new Error("BOT_INTERVAL_MS/--interval-ms precisa ser um numero positivo.");
  }

  return config;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timestamp() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
}

function generateValidCnpj() {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));

  const verifier = (base, weights) => {
    const sum = base.reduce((acc, digit, index) => acc + digit * weights[index], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  digits.push(verifier(digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
  digits.push(verifier(digits, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));

  return digits.join("");
}

function buildCompanyData() {
  const stamp = timestamp();

  return {
    companyName: `Empresa Bot ${stamp}`,
    cnae: "47.11-3-02",
    cnpj: generateValidCnpj(),
    responsibleName: `Responsavel ${stamp}`,
    responsibleEmail: `bot.${stamp}@example.com`,
    establishmentName: `Unidade ${stamp}`,
    riskLevel: "2",
    employeeCount: "25",
    cep: "01001000",
    street: "Praca da Se",
    number: "100",
    complement: "Sala 1",
  };
}

async function fillFieldAfterLabel(page, pattern, value, kind = "input") {
  const field = page
    .locator("label")
    .filter({ hasText: pattern })
    .first()
    .locator("xpath=following-sibling::*[1]");

  await field.waitFor({ state: "visible", timeout: 15000 });

  if (kind === "select") {
    await field.selectOption(value);
    return;
  }

  await field.fill(value);
}

async function login(page, config) {
  await page.goto(config.baseUrl, { waitUntil: "networkidle" });
  await page.locator("#login-email").fill(config.email);
  await page.locator("#login-password").fill(config.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/me/") && response.request().method() === "GET",
    { timeout: 30000 }
  );
}

async function openCompanyForm(page) {
  await page.getByRole("button", { name: "Empresas" }).click();
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "+ Nova Empresa" }).click();

  const nextButton = page.locator("button").filter({ hasText: /Pr/ }).last();
  await nextButton.click();
  await nextButton.click();
}

async function createCompany(page, company) {
  await fillFieldAfterLabel(page, /Nome da empresa/, company.companyName);
  await page.locator('input[placeholder="Ex.: 47.11-3-02"]').fill(company.cnae);
  await fillFieldAfterLabel(page, /CNPJ/, company.cnpj);
  await fillFieldAfterLabel(page, /Nome do respons/, company.responsibleName);
  await fillFieldAfterLabel(page, /E-mail do respons/, company.responsibleEmail);
  await fillFieldAfterLabel(page, /Nome do estabelecimento/, company.establishmentName);
  await fillFieldAfterLabel(page, /Tipo de avalia/, "SETOR", "select");
  await page.getByText(/criar apenas a empresa/i).click();
  await fillFieldAfterLabel(page, /Grau de risco/, company.riskLevel, "select");
  await fillFieldAfterLabel(page, /N.mero de funcion/, company.employeeCount);
  await fillFieldAfterLabel(page, /CEP/, company.cep);

  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll("input"))
        .filter((input) => input.readOnly)
        .some((input) => input.value.length > 0),
    null,
    { timeout: 20000 }
  );

  await fillFieldAfterLabel(page, /Rua/, company.street);
  await fillFieldAfterLabel(page, /^N.mero \(Opcional\)/, company.number);
  await fillFieldAfterLabel(page, /Complemento/, company.complement);

  const createResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/empresas/") && response.request().method() === "POST",
    { timeout: 30000 }
  );

  await page.getByRole("button", { name: /Criar empresa/i }).click();
  const response = await createResponse;

  if (!response.ok()) {
    throw new Error(`Falha ao criar empresa. HTTP ${response.status()}.`);
  }

  await page.waitForTimeout(2000);
}

async function runCycle(browser, config, cycleNumber) {
  const company = buildCompanyData();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await login(page, config);
    await openCompanyForm(page);
    await createCompany(page, company);

    console.log(
      `[${new Date().toISOString()}] ciclo ${cycleNumber}: empresa criada com sucesso | nome="${company.companyName}" | cnpj=${company.cnpj}`
    );
  } finally {
    await context.close();
  }
}

async function main() {
  const config = parseArgs(process.argv.slice(2));
  const browser = await chromium.launch({ headless: config.headless });

  console.log(
    `Bot iniciado em ${config.baseUrl} | headless=${config.headless} | intervalo=${config.intervalMs}ms | modo=${config.once ? "once" : "loop"}`
  );

  let cycleNumber = 1;

  try {
    do {
      try {
        await runCycle(browser, config, cycleNumber);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ciclo ${cycleNumber}: erro`, error);

        if (config.once) {
          throw error;
        }
      }

      if (config.once) {
        break;
      }

      cycleNumber += 1;
      await sleep(config.intervalMs);
    } while (true);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
