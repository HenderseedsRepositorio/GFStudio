/* ═══════════════════════════════════════════════════════════════════════
   CONFIGURACIÓN DEL ESTUDIO — punto único de personalización.

   Para dar de alta un cliente nuevo: copiar este archivo y cambiar SOLO
   estos valores. Nada más se toca en index.html / admin.html.

   Notas:
   - supabaseKey es la anon key: es PÚBLICA por diseño (va al browser).
     Los permisos reales los da RLS. No es un secret.
   - Si cambia supabaseUrl, hay que actualizar TAMBIÉN el connect-src del
     CSP en el <head> de index.html y admin.html (un <meta> no puede leer JS).
   - El resto del contenido (servicios, precios, textos, horarios, galería)
     se edita desde el panel admin, no acá.
   ═══════════════════════════════════════════════════════════════════════ */
window.GF_CONFIG = {
  // ── Identidad ──
  brandName:   "GF Studio",
  ownerName:   "Guada",

  // ── Contacto ──
  whatsapp:     "5492314555856",   // número que recibe las reservas
  whatsappTest: "5492314573218",   // número de pruebas (solo admin)
  instagram:    "@gfstudio.ok",

  // ── Backend (Supabase) ──
  supabaseUrl:  "https://ibikdnjuctopdkmtmgdd.supabase.co",
  supabaseKey:  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliaWtkbmp1Y3RvcGRrbXRtZ2RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MjEwOTMsImV4cCI6MjA5MTA5NzA5M30.Tzsi0ZbcdohuJLFTut4z8h2vf5yi1dv_KfA_6m6COBI",

  // ── Admin ──
  adminEmail:   "guadalupefernandez016@gmail.com",  // identificador técnico en Supabase Auth

  // ── CRM · cadencia de retoque ──
  // Cada cuántas SEMANAS una clienta "vuelve" para su servicio. El panel usa esto para
  // marcar "Para retoque" (vencida para su retoque) antes de que caiga en "Dormida".
  //   · default: se aplica a cualquier servicio sin override. null = desactivar el signal.
  //   · byCategory: override por categoría de servicio (clave = category, no distingue may/min).
  // Si una clienta ya tiene 2+ visitas del mismo servicio, su ritmo REAL (mediana) pisa esto.
  cadenceWeeks: {
    default: 5,
    byCategory: {
      "cejas":       4,
      "pestañas":    3,
      "uñas":        3,
      "depilación":  4,
    },
  },

  // ── Paleta de marca ── cambiar acá re-viste toda la web y el panel
  theme: {
    "olive-dk":      "#3D4A18",  // acento principal / botones / hover
    "olive":         "#5E6B2E",  // acento
    "olive-lt":      "#8A9456",
    "olive-soft":    "#B8C481",
    "sand":          "#E8E2D4",
    "bone":          "#F2EDE0",  // fondo
    "cream":         "#FAF7EF",
    "ink":           "#1A1810",  // texto
    "ink-sec":       "#3F3B2E",
    "muted":         "#6B6650",
    "border":        "rgba(26,24,16,.08)",
    "border-strong": "rgba(26,24,16,.14)",
    "danger":        "#A33B2A",  // semántico (rojo) — normalmente no se cambia
    "success":       "#4A6B2E",  // semántico (verde) — normalmente no se cambia
  },
};

/* Aplica la paleta a las CSS custom properties. Un setProperty inline con
   !important gana sobre el :root y sobre el bloque @media(prefers-color-scheme:dark),
   así un solo lugar (este archivo) controla los colores.
   Para GF Studio los valores son idénticos a los del CSS → no cambia nada visible.
   Para un cliente nuevo, cambiar el bloque theme de arriba re-viste toda la web. */
(function(){
  try {
    var t = (window.GF_CONFIG && window.GF_CONFIG.theme) || {};
    var r = document.documentElement;
    for (var k in t) { if (Object.prototype.hasOwnProperty.call(t, k)) r.style.setProperty('--'+k, t[k], 'important'); }
    // El fondo del <html> está como literal en el CSS (no como var): lo sincronizamos también
    if (t.bone) {
      r.style.setProperty('background-color', t.bone, 'important');
      r.style.setProperty('background-image', 'linear-gradient('+t.bone+','+t.bone+')', 'important');
    }
  } catch(e) { /* si algo falla, quedan los colores del CSS por defecto */ }
})();
