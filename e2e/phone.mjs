// Phone + desktop check of the hub.   BASE=http://127.0.0.1:8174/ node e2e/phone.mjs
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE || "http://127.0.0.1:8174/";
const SHOTS = process.env.SHOTS || join(root, "shots");
await mkdir(SHOTS, { recursive: true });
const results = [];
const check = (name, ok, detail = "") => { results.push({ ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`); };
const browser = await puppeteer.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
for (const scheme of ["light", "dark"]) {
  for (const d of [{ name: "phone", width: 390, height: 844, mobile: true }, { name: "small", width: 360, height: 640, mobile: true }, { name: "desk", width: 1366, height: 900, mobile: false }]) {
    const tag = `${d.name}-${scheme}`;
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error" && !/ERR_CONNECTION_REFUSED/.test(m.text())) errors.push(m.text()); });
    page.on("requestfailed", (r) => { if (!r.url().includes("cloudflareinsights.com")) errors.push(`failed: ${r.url()}`); else console.log(`note: analytics beacon blocked on this network (${r.failure()?.errorText})`); });
    await page.setViewport({ width: d.width, height: d.height, deviceScaleFactor: 2, isMobile: d.mobile, hasTouch: d.mobile });
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
    await page.goto(BASE, { waitUntil: "networkidle0" });
    await page.evaluate(() => { try { localStorage.clear(); } catch {} });
    await page.reload({ waitUntil: "networkidle0" });
    const w = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    check(`${tag}: page width is the device width`, w.iw === d.width, String(w.iw));
    check(`${tag}: no sideways scroll`, w.sw <= w.iw, String(w.sw));
    check(`${tag}: three app cards`, (await page.$$eval(".app", (els) => els.length)) === 3);
    await page.evaluate(async () => { for (const img of document.querySelectorAll(".app img")) { img.loading = "eager"; } window.scrollTo(0, document.body.scrollHeight); });
    await new Promise((r) => setTimeout(r, 800));
    const shown = await page.$$eval(".app img", (imgs) => imgs.filter((i) => getComputedStyle(i).display !== "none").map((i) => [i.src.split("/").pop(), i.complete && i.naturalWidth > 0]));
    check(`${tag}: one screenshot per card, in this theme, loaded`, shown.length === 3 && shown.every(([s, ok]) => ok && s.includes(scheme)), JSON.stringify(shown));
    const links = await page.$$eval(".app .btn:not(.ghost)", (as) => as.map((a) => a.href));
    check(`${tag}: open buttons go to the apps`, links.join(" ") === "https://fineprint.meetdominic.me/ https://first90.meetdominic.me/ https://crew.meetdominic.me/", links.join(" "));
    const small = await page.$$eval(".btn, .icon-btn, .nav a", (els) => els.filter((e) => e.offsetParent).map((e) => Math.round(e.getBoundingClientRect().height)).filter((h) => h < 40));
    check(`${tag}: tap targets 40px+`, small.length === 0, JSON.stringify(small));
    check(`${tag}: version in footer`, /v\d+\.\d+\.\d+/.test(await page.$eval(".foot span", (el) => el.textContent)));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: join(SHOTS, `${tag}-top.png`) });
    await page.$eval("#apps", (el) => el.scrollIntoView());
    await page.screenshot({ path: join(SHOTS, `${tag}-apps.png`) });
    await page.click("#theme");
    const flipped = await page.$$eval(".app img", (imgs, want) => imgs.filter((i) => getComputedStyle(i).display !== "none").map((i) => i.src.includes(want)), scheme === "dark" ? "light" : "dark");
    check(`${tag}: theme toggle swaps screenshots`, flipped.length === 3 && flipped.every(Boolean));
    check(`${tag}: no page errors`, errors.length === 0, errors.join(" | "));
    await page.close();
  }
}
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
