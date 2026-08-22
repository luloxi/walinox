import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const FAIL = [];
const PASS = [];

function ok(name) {
  PASS.push(name);
  console.log("PASS", name);
}
function bad(name, err) {
  FAIL.push(`${name}: ${err}`);
  console.log("FAIL", name, err);
}

async function shot(page, name) {
  await mkdir("/tmp/walinox-e2e", { recursive: true });
  await page.screenshot({ path: `/tmp/walinox-e2e/${name}.png`, fullPage: false });
}

async function waitBody(page, needle, timeout = 25000) {
  await page.waitForFunction(
    (text) => document.body && document.body.innerText.includes(text),
    needle,
    { timeout },
  );
}

async function loginLocal(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await waitBody(page, "Conectar billetera");
  await page.getByRole("button", { name: /Usar billetera local/i }).click();
  await waitBody(page, "Aceptar y firmar");
  await page.getByRole("button", { name: /Aceptar y firmar/i }).click();
  await waitBody(page, "Firmar cada envío");
  await page.getByRole("button", { name: /^Firmar cada envío$/ }).click();
  await waitBody(page, "Billetera");
  const later = page.getByRole("button", { name: /Ahora no/i });
  if (await later.isVisible().catch(() => false)) await later.click();
}

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const guest = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await guest.newPage();
  page.setDefaultTimeout(25000);

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await waitBody(page, "Walinox");
  const landing = await page.innerText("body");
  if (landing.includes("Conectar billetera") && landing.includes("Plata que viaja")) ok("landing hero");
  else bad("landing hero", landing.slice(0, 180));
  await page.locator("a[href='#que-es']").click({ force: true });
  await waitBody(page, "Una billetera para el día a día");
  if ((await page.innerText("body")).includes("Dólares que son tuyos")) ok("landing scroll");
  else bad("landing scroll", "missing product copy");
  await shot(page, "01-landing");

  await page.goto(`${BASE}/tienda/tostaduria-sur`, { waitUntil: "domcontentloaded" });
  await waitBody(page, "Tostaduría Sur");
  const store = await page.innerText("body");
  if (store.includes("Iniciar sesión") && store.includes("Café") && !store.includes("Plata que viaja")) {
    ok("public store without wallet");
  } else bad("public store without wallet", store.slice(0, 200));
  if (store.includes("Billetera") && store.includes("Ajustes") && store.includes("Contactos")) {
    bad("public store chrome", "full app nav leaked to guest");
  } else ok("public store has no app nav");
  await shot(page, "02-public-store");

  const productHref = await page.locator('a[href*="/products/"]').first().getAttribute("href");
  if (productHref) await page.goto(new URL(productHref, BASE).toString(), { waitUntil: "domcontentloaded" });
  else {
    await page.goto(
      `${BASE}/products/${encodeURIComponent("mock:tostaduria-sur:café-de-especialidad-250g")}`,
      { waitUntil: "domcontentloaded" },
    );
  }
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText ?? "";
      return t.includes("para comprar") || t.includes("No está este producto") || t.includes("Comprar");
    },
    null,
    { timeout: 25000 },
  );
  const prod = await page.innerText("body");
  if (prod.includes("Iniciar sesión para comprar") || prod.includes("Conectá tu billetera")) {
    ok("public product asks to log in");
  } else if (prod.includes("No está este producto")) {
    bad("public product asks to log in", "product not found");
  } else bad("public product asks to log in", prod.slice(0, 220));
  await shot(page, "03-public-product");
  await guest.close();

  const authed = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ["microphone"],
  });
  const app = await authed.newPage();
  app.setDefaultTimeout(30000);
  await loginLocal(app);
  ok("local wallet login");
  await shot(app, "04-home");

  const home = await app.innerText("body");
  if (home.includes("Ajustes")) ok("nav has Ajustes");
  else bad("nav has Ajustes", "missing");
  const headerBits = await app.evaluate(() => {
    const header = document.querySelector("header");
    const aside = document.querySelector("aside");
    const text = `${header?.innerText ?? ""} ${aside?.innerText ?? ""}`;
    return {
      bell: Boolean(document.querySelector('button[aria-label*="Avisos"], button[aria-label*="avisos"]')),
      chain: /Ethereum|Polygon|Base/.test(text) && Boolean(aside?.querySelector("[data-rk]")),
    };
  });
  if (!headerBits.bell) ok("no inbox bell in chrome");
  else bad("no inbox bell in chrome", "bell present");

  const layout = await app.evaluate(() => {
    const main = document.querySelector("main");
    const r = main?.getBoundingClientRect();
    return { w: Math.round(r?.width ?? 0), vw: window.innerWidth };
  });
  if (layout.w > 900 && layout.w > layout.vw * 0.6) ok("home main fills desktop");
  else bad("home main fills desktop", JSON.stringify(layout));

  await app.getByRole("link", { name: "Tienda" }).first().click();
  await waitBody(app, "Comprador");
  const tienda = await app.evaluate(() => {
    const main = document.querySelector("main");
    const nestedY = [...document.querySelectorAll("div,section,ul")].filter((el) => {
      const s = getComputedStyle(el);
      return (
        (s.overflowY === "auto" || s.overflowY === "scroll") &&
        el !== main &&
        el.scrollHeight > el.clientHeight + 40 &&
        el.clientHeight > 80
      );
    }).length;
    const body = document.body.innerText;
    return {
      nestedY,
      titleHint: body.includes("Tienda") && body.includes("?") && /Tienda\s*\?/.test(body),
      comprador: body.includes("Comprador"),
      mainW: Math.round(main.getBoundingClientRect().width),
    };
  });
  if (tienda.comprador && tienda.mainW > 900) ok("tienda desktop width");
  else bad("tienda desktop width", JSON.stringify(tienda));
  if (tienda.nestedY === 0) ok("tienda no nested vertical pane");
  else bad("tienda no nested vertical pane", `nested=${tienda.nestedY}`);
  await shot(app, "05-tienda");

  await app.getByRole("link", { name: "Actividad" }).first().click();
  await waitBody(app, "Ingresos");
  const act = await app.innerText("body");
  if (act.includes("USDT en Etherscan")) bad("actividad no USDT etherscan", "old link still there");
  else ok("actividad no USDT etherscan");
  if (act.includes("Ver actividad en Etherscan")) ok("actividad etherscan button");
  else bad("actividad etherscan button", "missing");
  const actLayout = await app.evaluate(() => {
    const main = document.querySelector("main");
    const nestedY = [...document.querySelectorAll("div,section")].filter((el) => {
      const s = getComputedStyle(el);
      return (
        (s.overflowY === "auto" || s.overflowY === "scroll") &&
        el !== main &&
        el.scrollHeight > el.clientHeight + 40 &&
        el.clientHeight > 80
      );
    }).length;
    return { nestedY, mainW: Math.round(main.getBoundingClientRect().width) };
  });
  if (actLayout.nestedY === 0 && actLayout.mainW > 900) ok("actividad full pane");
  else bad("actividad full pane", JSON.stringify(actLayout));
  await shot(app, "06-actividad");

  await app.getByRole("link", { name: "Contactos" }).first().click();
  await waitBody(app, "Historial");
  await app.locator('a[href*="/contacts/"]').first().click();
  await waitBody(app, "Historial");
  const back = app.locator('a[href="/contacts"]').filter({ hasText: "Contactos" });
  if ((await back.count()) > 0) ok("contact detail back link");
  else bad("contact detail back link", "missing");
  await shot(app, "07-contacto");

  await app.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
  try {
    await waitBody(app, "Desconectar", 20000);
  } catch {
    bad("settings loaded", (await app.innerText("body").catch(() => "")).slice(0, 240));
  }
  const settings = await app.innerText("body");
  if (settings.includes("Peso argentino") && settings.includes("Primero USDT")) ok("settings currency");
  else bad("settings currency", settings.slice(0, 250));
  if (/desconectar/i.test(settings) && /avisos/i.test(settings)) ok("settings wallet + avisos");
  else bad("settings wallet + avisos", settings.slice(0, 200));
  await app.locator('select[aria-label="Moneda local"]').selectOption("BRL");
  await waitBody(app, "Real");
  ok("settings switch to BRL");
  await app.locator('select[aria-label="Moneda local"]').selectOption("ARS");
  await shot(app, "08-ajustes");

  await app.goto(`${BASE}/?tab=enviar`, { waitUntil: "domcontentloaded" });
  await waitBody(app, "Online");
  await waitBody(app, "Online");
  await app.getByRole("button", { name: /En una frase/i }).click({ force: true });
  const box = app.locator("textarea").first();
  await box.waitFor({ state: "visible" });
  if (await app.getByRole("button", { name: "Hablar" }).isVisible()) ok("agent mic button");
  else bad("agent mic button", "Hablar not visible (browser may lack SpeechRecognition)");
  await box.fill("mandale 10 USDT a 0x1111111111111111111111111111111111111111");
  await box.press("Enter");
  try {
    await app.waitForFunction(
      () => {
        const t = document.body?.innerText ?? "";
        const area = document.querySelector("textarea");
        const gone = !area || area.offsetParent === null;
        return gone || /0x1111/i.test(t);
      },
      null,
      { timeout: 20000 },
    );
    ok("agent Enter sends");
  } catch {
    const dest = await app.locator('input[aria-label*="address" i], input').nth(0).inputValue().catch(() => "");
    bad("agent Enter sends", `dest=${dest} ${(await app.innerText("body")).slice(0, 160)}`);
  }
  await shot(app, "09-enviar-agente");

  await authed.close();
} catch (err) {
  bad("runner", err instanceof Error ? err.stack ?? err.message : String(err));
} finally {
  await browser.close();
}

console.log("\n---");
console.log(`${PASS.length} passed, ${FAIL.length} failed`);
if (FAIL.length) {
  for (const line of FAIL) console.log(" ", line);
  process.exit(1);
}
