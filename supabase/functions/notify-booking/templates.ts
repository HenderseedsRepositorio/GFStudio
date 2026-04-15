interface BookingData {
  nombre: string;
  email: string;
  telefono: string;
  servicio: string;
  fecha: string;
  horario: string;
  precio: string;
}

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 560px; margin: 0 auto; padding: 32px 24px;
  color: #1C1A14; background: #F5F1E8;
`;
const BOX_STYLE = `
  background: #FEFDF8; border-radius: 16px; padding: 24px;
  border: 1px solid rgba(0,0,0,.06); margin: 24px 0;
`;
const ROW_STYLE = `
  display: flex; justify-content: space-between; padding: 10px 0;
  border-bottom: 1px solid rgba(0,0,0,.04); font-size: 14px;
`;

export function clientEmailHTML(d: BookingData): string {
  return `
<div style="${BASE_STYLE}">
  <h1 style="font-family: 'Playfair Display', Georgia, serif; color: #3D4A18; font-size: 28px; margin: 0 0 6px; font-weight: 700;">GF Studio</h1>
  <p style="color: #5C5840; font-size: 13px; margin: 0 0 28px; font-style: italic;">El arte de cuidarte</p>
  <h2 style="font-size: 22px; margin: 0 0 8px; color: #1C1A14;">¡Hola ${d.nombre}! ✨</h2>
  <p style="color: #5C5840; line-height: 1.6; font-size: 15px;">Recibimos tu reserva. Estos son los detalles:</p>
  <div style="${BOX_STYLE}">
    <div style="${ROW_STYLE}"><span style="color:#8A8470;">📅 Fecha y hora</span><strong>${d.fecha} — ${d.horario} hs</strong></div>
    <div style="${ROW_STYLE}"><span style="color:#8A8470;">💆 Servicio</span><strong>${d.servicio}</strong></div>
    <div style="${ROW_STYLE}"><span style="color:#8A8470;">👩‍🎨 Profesional</span><strong>Guada</strong></div>
    <div style="${ROW_STYLE}"><span style="color:#8A8470;">📍 Dirección</span><strong>Hipólito Yrigoyen 229, Henderson</strong></div>
    <div style="${ROW_STYLE} border-bottom: none;"><span style="color:#8A8470;">💰 Precio</span><strong style="color:#3D4A18;">${d.precio}</strong></div>
  </div>
  <p style="color: #5C5840; line-height: 1.6; font-size: 14px;">Te confirmamos a la brevedad por WhatsApp. Cualquier cambio o reagendamiento, respondé este mail o escribinos con anticipación.</p>
  <p style="color: #5C5840; line-height: 1.6; font-size: 14px; margin-top: 20px;">¡Te esperamos! 💚</p>
  <hr style="border: none; border-top: 1px solid rgba(0,0,0,.06); margin: 32px 0 16px;"/>
  <p style="color: #8A8470; font-size: 11px; margin: 0;">GF Studio — Henderson, Buenos Aires</p>
</div>`;
}

export function guadaEmailHTML(d: BookingData): string {
  const waLink = `https://wa.me/${d.telefono.replace(/\D/g, '')}`;
  return `
<div style="${BASE_STYLE}">
  <h1 style="font-family: 'Playfair Display', Georgia, serif; color: #3D4A18; font-size: 24px; margin: 0 0 16px;">Nuevo turno 🌿</h1>
  <div style="${BOX_STYLE}">
    <div style="${ROW_STYLE}"><span style="color:#8A8470;">Cliente</span><strong>${d.nombre}</strong></div>
    <div style="${ROW_STYLE}"><span style="color:#8A8470;">Teléfono</span><strong>${d.telefono}</strong></div>
    <div style="${ROW_STYLE}"><span style="color:#8A8470;">Email</span><span>${d.email}</span></div>
    <div style="${ROW_STYLE}"><span style="color:#8A8470;">Servicio</span><strong>${d.servicio}</strong></div>
    <div style="${ROW_STYLE}"><span style="color:#8A8470;">Fecha</span><strong>${d.fecha}</strong></div>
    <div style="${ROW_STYLE}"><span style="color:#8A8470;">Horario</span><strong>${d.horario}</strong></div>
    <div style="${ROW_STYLE} border-bottom: none;"><span style="color:#8A8470;">Precio</span><strong style="color:#3D4A18;">${d.precio}</strong></div>
  </div>
  <div style="text-align: center; margin: 24px 0;">
    <a href="${waLink}" style="display: inline-block; background: #25D366; color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 500; font-size: 14px;">Abrir WhatsApp con ${d.nombre}</a>
  </div>
  <p style="color: #8A8470; font-size: 12px; text-align: center;">Entrá al panel para confirmar o cancelar.</p>
</div>`;
}

export type { BookingData };
