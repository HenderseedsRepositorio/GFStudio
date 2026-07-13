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
};
