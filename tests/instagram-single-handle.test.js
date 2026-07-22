/* Fase 0 · Bug #4 — un solo handle de Instagram, con config.js como fuente única.
   No toca React ni la DB: lee los archivos vivos y verifica que:
     1) config.js define un handle no vacío,
     2) el conjunto de handles distintos en config + index + admin colapsa a UNO,
     3) index.html y admin.html NO hardcodean ningún handle literal (lo derivan de config),
     4) index.html y admin.html referencian GF_CONFIG.instagram.
   Antes del fix este test falla: hay dos handles (@gfstudio.ok vs @gf.studio.henderson)
   y el HTML tiene literales hardcodeados. */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const config = read("config.js");
const index = read("index.html");
const admin = read("admin.html");

// Extrae handles de Instagram SOLO en contexto inequívoco (evita emails/dominios):
//   · instagram: "..."      (objetos de contacto)
//   · c.instagram || "..."  (fallback de render)
//   · instagram.com/<handle> (URL de perfil)
function handlesIn(src) {
  const out = [];
  let m;
  const reAssign = /instagram\s*:\s*["'`]([^"'`]+)["'`]/gi;
  while ((m = reAssign.exec(src))) out.push(m[1]);
  const reFallback = /instagram\s*\|\|\s*["'`]([^"'`]+)["'`]/gi;
  while ((m = reFallback.exec(src))) out.push(m[1]);
  const reUrl = /instagram\.com\/([A-Za-z0-9._]+)/gi;
  while ((m = reUrl.exec(src))) out.push("@" + m[1]);
  return out;
}
const norm = h => h.trim().replace(/^@/, "").replace(/\/+$/, "").toLowerCase();

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  console.log(`${cond ? "PASS" : "FAIL"} · ${name}${cond ? "" : "  → " + detail}`);
  cond ? pass++ : fail++;
};

// 1) config define el handle
const cfgHandles = handlesIn(config);
ok("config.js define un handle de Instagram", cfgHandles.length >= 1, `encontrados: ${JSON.stringify(cfgHandles)}`);
const cfgHandle = cfgHandles.length ? norm(cfgHandles[0]) : null;

// 2) un solo handle distinto en todo el sitio
const all = [...handlesIn(config), ...handlesIn(index), ...handlesIn(admin)].map(norm);
const distinct = [...new Set(all)];
ok("un solo handle distinto en config+index+admin", distinct.length === 1, `distintos: ${JSON.stringify(distinct)}`);
ok("el handle único coincide con config.js", distinct.length === 1 && distinct[0] === cfgHandle, `único=${JSON.stringify(distinct)} config=${cfgHandle}`);

// 3) el HTML no hardcodea handles literales (los deriva de config)
const idxLiterals = handlesIn(index);
const admLiterals = handlesIn(admin);
ok("index.html sin handle literal hardcodeado", idxLiterals.length === 0, `literales: ${JSON.stringify(idxLiterals)}`);
ok("admin.html sin handle literal hardcodeado", admLiterals.length === 0, `literales: ${JSON.stringify(admLiterals)}`);

// 4) el HTML referencia GF_CONFIG.instagram
ok("index.html referencia GF_CONFIG.instagram", /GF_CONFIG\.instagram/.test(index));
ok("admin.html referencia GF_CONFIG.instagram", /GF_CONFIG\.instagram/.test(admin));

console.log(`\n${pass} PASS · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
