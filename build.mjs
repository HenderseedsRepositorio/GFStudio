/* Build de producción — pre-transpila el JSX que Babel standalone convertía en el browser.
   El workflow de desarrollo NO cambia: index.html / admin.html se editan igual que siempre
   y abren en local con Babel standalone. Este script corre solo en el deploy (Vercel) y en CI:
     1. copia los estáticos a dist/
     2. extrae el bloque <script type="text/babel"> de cada página
     3. lo transpila con @babel/preset-react (runtime classic → React UMD global)
     4. lo re-inyecta como <script> normal, saca el CDN de Babel y el 'unsafe-eval' del CSP
   Resultado: −561 KB gzip y varios segundos menos de CPU por visita, mismo código fuente. */
import { readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { transformAsync } from "@babel/core";

const PAGES = ["index.html", "admin.html"];
const STATIC = ["config.js", "shared.js", "utilities.css", "og-image.png", "assets"];

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
for (const f of STATIC) await cp(f, `dist/${f}`, { recursive: true });

for (const page of PAGES) {
  let html = await readFile(page, "utf8");
  const re = /<script type="text\/babel">([\s\S]*?)<\/script>/;
  const m = html.match(re);
  if (!m) throw new Error(`${page}: no encontré el bloque <script type="text/babel">`);

  const { code } = await transformAsync(m[1], {
    presets: [["@babel/preset-react", { runtime: "classic" }]],
    babelrc: false,
    configFile: false,
    compact: false,
  });

  html = html.replace(re, () => `<script>\n${code}\n</script>`);

  const before = html.length;
  html = html.replace(/<script src="https:\/\/unpkg\.com\/@babel\/standalone[^"]*"><\/script>\s*/, "");
  if (html.length === before) throw new Error(`${page}: no encontré el <script> CDN de Babel para remover`);

  // 'unsafe-eval' en el CSP existía solo para Babel standalone
  html = html.replace(" 'unsafe-eval'", "");

  await writeFile(`dist/${page}`, html);
  console.log(`${page}: transpilado OK (${(code.length / 1024).toFixed(0)} KB de JS)`);
}
console.log("Build OK → dist/");
