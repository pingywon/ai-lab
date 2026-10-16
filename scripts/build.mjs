// Copies public/ to dist/ and stamps the one version number (package.json).
import { readFile, writeFile, rm, cp, mkdir, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const { version } = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
await mkdir(dist, { recursive: true });
for (const entry of await readdir(dist)) await rm(join(dist, entry), { recursive: true, force: true });
await cp(join(root, "public"), dist, { recursive: true });
for (const name of await readdir(dist)) {
  if (!name.endsWith(".html")) continue;
  const file = join(dist, name);
  await writeFile(file, (await readFile(file, "utf8")).replaceAll("{{VERSION}}", version));
}
await writeFile(join(dist, "version.txt"), `${version}\n`);
console.log(`built dist/ for v${version}`);
