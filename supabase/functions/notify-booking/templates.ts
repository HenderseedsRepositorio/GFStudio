interface BookingData {
  nombre: string;
  email: string;
  telefono: string;
  servicio: string;
  fecha: string;
  horario: string;
  precio: string;
}

function row(label: string, value: string, last = false, highlight = false): string {
  const border = last ? "" : "border-bottom: 1px solid rgba(0,0,0,.05);";
  const valueColor = highlight ? "#3D4A18" : "#1C1A14";
  return `
  <tr>
    <td style="padding: 12px 0; ${border} color: #8A8470; font-size: 13px; vertical-align: top; white-space: nowrap;">${label}</td>
    <td style="padding: 12px 0; ${border} color: ${valueColor}; font-size: 14px; font-weight: 600; text-align: right; vertical-align: top;">${value}</td>
  </tr>`;
}

export function clientEmailHTML(d: BookingData): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Recibimos tu reserva</title>
</head>
<body style="margin: 0; padding: 0;">
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F5F1E8; padding: 40px 20px; margin: 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 560px; margin: 0 auto;">
    <tr><td style="padding: 0 8px;">
      <h1 style="font-family: 'Playfair Display', Georgia, serif; color: #3D4A18; font-size: 30px; margin: 0 0 6px; font-weight: 700; letter-spacing: -0.5px;">GF Studio</h1>
      <p style="color: #8A8470; font-size: 13px; margin: 0 0 32px; font-style: italic; letter-spacing: 0.5px;">El arte de cuidarte</p>
      <h2 style="font-size: 22px; margin: 0 0 10px; color: #1C1A14; font-weight: 600;">¡Hola ${d.nombre}! ✨</h2>
      <p style="color: #5C5840; line-height: 1.6; font-size: 15px; margin: 0 0 8px;">Recibimos tu reserva. Estos son los detalles:</p>
    </td></tr>
    <tr><td style="padding: 8px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #FEFDF8; border-radius: 16px; border: 1px solid rgba(0,0,0,.06);">
        <tr><td style="padding: 8px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${row("📅 &nbsp; Fecha y hora", `${d.fecha} — ${d.horario} hs`)}
            ${row("💆 &nbsp; Servicio", d.servicio)}
            ${row("👩‍🎨 &nbsp; Profesional", "Guada")}
            ${row("📍 &nbsp; Dirección", "Hipólito Yrigoyen 229, Henderson")}
            ${row("💰 &nbsp; Precio", d.precio, true, true)}
          </table>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding: 16px 8px 0;">
      <p style="color: #5C5840; line-height: 1.6; font-size: 14px; margin: 0 0 16px;">Te confirmamos a la brevedad por WhatsApp. Cualquier cambio o reagendamiento, respondé este mail o escribinos con anticipación.</p>
      <p style="color: #5C5840; line-height: 1.6; font-size: 14px; margin: 0;">¡Te esperamos! 💚</p>
      <hr style="border: none; border-top: 1px solid rgba(0,0,0,.08); margin: 36px 0 16px;"/>
      <p style="color: #8A8470; font-size: 11px; margin: 0; letter-spacing: 0.3px;">GF Studio — Henderson, Buenos Aires</p>
    </td></tr>
  </table>
</div>
</body>
</html>`;
}

function waTel(p: string): string {
  const t = (p || "").replace(/\D/g, "");
  if (t.startsWith("549")) return t;
  if (t.startsWith("54")) return "549" + t.slice(2);
  return "549" + t;
}

export function guadaEmailHTML(d: BookingData): string {
  const waLink = `https://wa.me/${waTel(d.telefono)}`;
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nuevo turno</title>
</head>
<body style="margin: 0; padding: 0;">
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F5F1E8; padding: 40px 20px; margin: 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 560px; margin: 0 auto;">
    <tr><td style="padding: 0 8px;">
      <h1 style="font-family: 'Playfair Display', Georgia, serif; color: #3D4A18; font-size: 26px; margin: 0 0 20px; font-weight: 700;">Nuevo turno 🌿</h1>
    </td></tr>
    <tr><td style="padding: 8px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #FEFDF8; border-radius: 16px; border: 1px solid rgba(0,0,0,.06);">
        <tr><td style="padding: 8px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${row("Cliente", d.nombre)}
            ${row("Teléfono", d.telefono)}
            ${row("Email", d.email)}
            ${row("Servicio", d.servicio)}
            ${row("Fecha", d.fecha)}
            ${row("Horario", d.horario)}
            ${row("Precio", d.precio, true, true)}
          </table>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding: 24px 8px; text-align: center;">
      <a href="${waLink}" style="display: inline-block; background: #25D366; color: white; padding: 14px 32px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 14px;">Abrir WhatsApp con ${d.nombre}</a>
    </td></tr>
    <tr><td style="padding: 0 8px;">
      <p style="color: #8A8470; font-size: 12px; text-align: center; margin: 0;">Entrá al panel para confirmar o cancelar.</p>
    </td></tr>
  </table>
</div>
</body>
</html>`;
}

export type { BookingData };
