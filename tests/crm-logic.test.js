/* Test de lógica pura de la Tanda C — extrae las funciones REALES de admin.html
   (sin copiarlas: se corta el bloque del archivo) y las ejercita en Node.
   No toca React ni la DB; sólo valida cadencia + segmentación + merge CRM. */
const fs = require("fs");
const path = require("path");

const ADMIN = path.join(__dirname, "..", "admin.html");
const src = fs.readFileSync(ADMIN, "utf8");

const START = "const normPh = p =>";
const END = "\nconst ClientesTab = ";
const i0 = src.indexOf(START);
const i1 = src.indexOf(END, i0);
if (i0 < 0 || i1 < 0) { console.error("No se encontró el bloque de funciones puras"); process.exit(2); }
const block = src.slice(i0, i1);

// Entorno que el bloque asume (definido a nivel módulo en admin.html)
const TODAY = new Date("2026-07-13T12:00:00");
const CAD = { default: 5, byCategory: { "cejas": 4, "pestañas": 3, "uñas": 3, "depilación": 4 } };
const OWNER = "Guada", BRAND = "GF Studio";

const factory = new Function("TODAY", "CAD", "OWNER", "BRAND",
  block + "\nreturn { buildClientes, clientTag, cadenceDaysFor, waMessageFor, daysAgo, REACTIVATE_LABELS };");
const M = factory(TODAY, CAD, OWNER, BRAND);

const services = [
  { id: 1, name: "Diseño de cejas", category: "cejas", price: 5000 },
  { id: 2, name: "Color",           category: "color", price: 8000 },
  { id: 3, name: "Corte",           category: "",      price: 4000 },
];
const ap = (phone, service_id, date, status, extra = {}) =>
  ({ id: "a" + phone + date, client_phone: phone, client_name: "Cli " + phone, service_id, appointment_date: date, time_slot: "10:00", status, ...extra });

const appts = [
  // A) cejas recurrente vencida para retoque (3 visitas c/28d, última hace 42d)
  ap("23140001", 1, "2026-04-06", "completed"),
  ap("23140001", 1, "2026-05-04", "completed"),
  ap("23140001", 1, "2026-06-01", "completed"),
  // B) nueva (1 visita cejas hace 18d)
  ap("23140002", 1, "2026-06-25", "completed"),
  // C) color, sin categoría en config → default 5sem=35d; última hace 55d
  ap("23140003", 2, "2026-05-19", "completed"),
  // D) inactiva (última hace 100d) — Inactiva gana sobre cadencia
  ap("23140004", 1, "2026-04-04", "completed"),
  // E) sin cadencia (único turno cancelado) → Dormida genérica (hace 45d)
  ap("23140005", 3, "2026-05-29", "cancelled"),
  // F) merge CRM: teléfono con espacios en el turno, registro gf_clients sin espacios
  ap("2314 000 6", 1, "2026-07-10", "completed"),
  // G) sin registro CRM → notes/tags vacíos
  ap("23140007", 1, "2026-07-08", "completed"),
  // H) ritmo real LARGO (~150d): 2 visitas cejas a 150d; última hace 40d.
  //    ritmo real >90 desactiva el signal → NO "Para retoque", cae a Dormida genérica.
  ap("23140008", 1, "2026-01-04", "completed"),
  ap("23140008", 1, "2026-06-03", "completed"),
];
const clientsRecords = [
  { phone: "23140006", name: "Cli F", notes: "Alérgica al gel", tags: ["VIP", "cejas"] },
];

const clientes = M.buildClientes(appts, services, clientsRecords);
const byPhone = Object.fromEntries(clientes.map(c => [c.phone.replace(/\s/g, ""), c]));

let pass = 0, fail = 0;
const eq = (name, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  console.log(`${ok ? "PASS" : "FAIL"} · ${name}${ok ? "" : `  → got ${JSON.stringify(got)} exp ${JSON.stringify(exp)}`}`);
  ok ? pass++ : fail++;
};
const tagOf = ph => M.clientTag(byPhone[ph]).label;

eq("A cejas → Para retoque",            tagOf("23140001"),                    "Para retoque");
eq("A cadenceDays = 28 (mediana real)",  byPhone["23140001"].cadenceDays,      28);
eq("A dominantSvcName",                  byPhone["23140001"].dominantSvcName,   "Diseño de cejas");
eq("B 1 visita reciente → Nueva",        tagOf("23140002"),                    "Nueva");
eq("C color default 35d → Para retoque", tagOf("23140003"),                    "Para retoque");
eq("C cadenceDays = 35 (default config)",byPhone["23140003"].cadenceDays,      35);
eq("D 100d → Inactiva",                  tagOf("23140004"),                    "Inactiva");
eq("E turno cancelado → sin cadencia",   byPhone["23140005"].cadenceDays,      null);
eq("E → Dormida genérica",               tagOf("23140005"),                    "Dormida");
eq("F merge por tel con espacios → notes",byPhone["23140006"].crmNotes,        "Alérgica al gel");
eq("F merge → tags",                     byPhone["23140006"].crmTags,          ["VIP", "cejas"]);
eq("G sin registro CRM → notes vacío",   byPhone["23140007"].crmNotes,         "");
eq("G sin registro CRM → tags []",       byPhone["23140007"].crmTags,          []);
eq("H ritmo 150d → cadenceDays null",    byPhone["23140008"].cadenceDays,      null);
eq("H ritmo largo → Dormida",            tagOf("23140008"),                    "Dormida");

const waA = M.waMessageFor(byPhone["23140001"]);
eq("waMessageFor(A) menciona retoque",          /retoque/.test(waA),           true);
eq("waMessageFor(A) usa servicio en minúscula", /diseño de cejas/.test(waA),   true);
eq("REACTIVATE_LABELS",                  M.REACTIVATE_LABELS,                  ["Para retoque", "Dormida", "Inactiva"]);

console.log(`\n${pass} PASS · ${fail} FAIL`);
process.exit(fail ? 1 : 0);
