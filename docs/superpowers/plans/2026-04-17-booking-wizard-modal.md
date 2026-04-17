# Booking Wizard Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el form vertical de `#reservar` por un wizard de 3 pasos dentro de un modal fullscreen/panel centrado, con deep-link `?book=1` para bio IG.

**Architecture:** Componente `<BookingModal/>` nuevo dentro del mismo [index.html](../../../index.html) (sin build step). State machine interno con 4 modos (`servicio`/`fecha`/`datos`/`exito`). Comparte fetch de `svcs` y `blocks` con `<App/>`; fetch de `gf_appointments` por fecha ocurre adentro del modal. Deep link via `URLSearchParams` al mount.

**Tech Stack:** React 18 UMD + Babel standalone (sin build step) · Tailwind CDN · Supabase JS (ya presente) · CSS inline en `<style>` para transiciones.

**Spec:** [2026-04-17-booking-wizard-modal-design.md](../specs/2026-04-17-booking-wizard-modal-design.md)

**Estrategia de verificación:** Este proyecto no tiene tests unitarios (stack HTML+CDN). Cada tarea termina con una **checklist de verificación en navegador local** via `mcp__Claude_Preview__preview_start` (puerto 8080) y commit. Deploy a Vercel solo al final + chequeos de smoke en prod.

---

## Task 1: Base modal shell (open/close, backdrop, ESC)

**Files:**
- Modify: `index.html` — agregar CSS en `<style>`, agregar componente `<BookingModal/>` después del componente `Logo`, renderizarlo en `<App/>`.

- [ ] **Step 1: Agregar CSS del modal al `<style>`**

Insertar antes de `/* ── Grain overlay ── */` (aprox. [index.html:103](../../../index.html:103)):

```css
/* ── Booking modal ── */
.bk-backdrop{
  position:fixed;inset:0;z-index:100;
  background:rgba(0,0,0,.5);
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  animation:fadeIn .25s ease both;
}
.bk-modal{
  position:fixed;z-index:101;
  background:var(--cream);
  display:flex;flex-direction:column;
  animation:bkIn .28s cubic-bezier(.22,1,.36,1) both;
  overflow:hidden;
}
@media(max-width:639px){
  .bk-modal{inset:0;width:100dvw;height:100dvh;border-radius:0}
}
@media(min-width:640px){
  .bk-modal{
    top:50%;left:50%;transform:translate(-50%,-50%);
    width:min(520px,calc(100vw - 32px));
    max-height:min(780px,calc(100vh - 48px));
    border-radius:24px;
    box-shadow:0 32px 80px rgba(0,0,0,.2);
  }
}
@keyframes bkIn{
  from{opacity:0;transform:translate(-50%,-50%) scale(.96)}
  to{opacity:1;transform:translate(-50%,-50%) scale(1)}
}
@media(max-width:639px){
  @keyframes bkIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
}
```

- [ ] **Step 2: Crear componente `<BookingModal/>` básico**

Insertar después del componente `Logo` (aprox. [index.html:207](../../../index.html:207)):

```jsx
/* ═══ BOOKING MODAL ═══ */
const BookingModal=({open,onClose,svcs,blocks,initialServiceId})=>{
  const[step,setStep]=useState("servicio"); // servicio | fecha | datos | exito

  // ESC key + body scroll lock
  useEffect(()=>{
    if(!open)return;
    const onKey=e=>{if(e.key==="Escape")onClose()};
    document.addEventListener("keydown",onKey);
    const prev=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return()=>{
      document.removeEventListener("keydown",onKey);
      document.body.style.overflow=prev;
    };
  },[open,onClose]);

  if(!open)return null;

  return(
    <>
      <div className="bk-backdrop" onClick={onClose}/>
      <div className="bk-modal" role="dialog" aria-modal="true" aria-labelledby="bk-title">
        <div className="flex items-center justify-between p-5 border-b" style={{borderColor:'rgba(0,0,0,.06)'}}>
          <h2 id="bk-title" style={{fontFamily:'Playfair Display,serif',fontSize:'1.25rem',color:'var(--ink)'}}>Reservar turno</h2>
          <button onClick={onClose} aria-label="Cerrar" className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,.05)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <p style={{color:'var(--muted)'}}>Paso actual: {step}</p>
        </div>
      </div>
    </>
  );
};
```

- [ ] **Step 3: Renderizar el modal en `<App/>`**

En el return del `<App/>` (aprox. [index.html:348](../../../index.html:348)), al final del `<div className="min-h-screen">` justo antes del cierre, agregar:

```jsx
<BookingModal
  open={bk}
  onClose={()=>setBk(false)}
  svcs={svcs}
  blocks={blocks}
  initialServiceId={null}
/>
```

- [ ] **Step 4: Verificar en navegador local**

Usar `mcp__Claude_Preview__preview_start` apuntando al directorio del proyecto. Abrir [http://localhost:8080](http://localhost:8080).

**Checklist:**
- [ ] Click en "Reservar turno" del nav desktop → modal aparece, backdrop oscuro con blur.
- [ ] Desktop: panel centrado, 520px, bordes redondeados, sombra visible.
- [ ] Mobile (viewport < 640px): fullscreen sin radios.
- [ ] ESC cierra el modal.
- [ ] Click en backdrop cierra el modal.
- [ ] Click en X cierra el modal.
- [ ] Mientras está abierto, el body no hace scroll.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(web): base BookingModal shell (open/close, backdrop, ESC, scroll lock)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Modal header con breadcrumb de pasos

**Files:**
- Modify: `index.html` — actualizar el header del `<BookingModal/>` para mostrar título dinámico + breadcrumb de 3 pasos.

- [ ] **Step 1: Agregar CSS para el breadcrumb**

Agregar al bloque CSS del modal (después de `bkIn` keyframes):

```css
.bk-step{
  display:flex;align-items:center;gap:6px;
  font-size:11px;font-weight:500;letter-spacing:.05em;
  padding:6px 10px;border-radius:999px;
  transition:all .25s;
}
.bk-step-num{
  width:18px;height:18px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:10px;font-weight:600;
  transition:all .25s;
}
.bk-step.active{background:rgba(94,107,46,.12);color:var(--olive-dk)}
.bk-step.active .bk-step-num{background:var(--olive-dk);color:#fff}
.bk-step.done{color:var(--olive);cursor:pointer}
.bk-step.done:hover{background:rgba(94,107,46,.06)}
.bk-step.done .bk-step-num{background:var(--olive);color:#fff}
.bk-step.future{color:rgba(0,0,0,.25)}
.bk-step.future .bk-step-num{background:transparent;border:1.5px solid rgba(0,0,0,.15);color:rgba(0,0,0,.35)}
.bk-sep{width:20px;height:1px;background:rgba(0,0,0,.1)}
```

- [ ] **Step 2: Reemplazar el header con título dinámico + breadcrumb**

Reemplazar el bloque `<div className="flex items-center justify-between p-5 border-b">...</div>` por:

```jsx
{(()=>{
  const TITLES={servicio:"Elegí tu servicio",fecha:"Elegí fecha y horario",datos:"Confirmá tu turno",exito:"¡Turno reservado!"};
  const STEPS=[
    {id:"servicio",num:1,label:"Servicio"},
    {id:"fecha",num:2,label:"Fecha"},
    {id:"datos",num:3,label:"Datos"},
  ];
  const currentIdx=STEPS.findIndex(s=>s.id===step);
  const goStep=id=>{
    const idx=STEPS.findIndex(s=>s.id===id);
    if(idx<=currentIdx||step==="exito")return;
    setStep(id);
  };
  const stepClass=(s,i)=>{
    if(step==="exito")return "bk-step done";
    if(s.id===step)return "bk-step active";
    if(i<currentIdx)return "bk-step done";
    return "bk-step future";
  };
  return(
    <div className="border-b flex-shrink-0" style={{borderColor:'rgba(0,0,0,.06)'}}>
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 id="bk-title" style={{fontFamily:'Playfair Display,serif',fontSize:'1.25rem',color:'var(--ink)'}}>{TITLES[step]}</h2>
        <button onClick={onClose} aria-label="Cerrar" className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,.05)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div className="flex items-center gap-1 px-5 pb-4 overflow-x-auto">
        {STEPS.map((s,i)=>(
          <React.Fragment key={s.id}>
            <button type="button" onClick={()=>s.id!=="exito"&&i<currentIdx&&goStep(s.id)} className={stepClass(s,i)} disabled={step==="exito"||i>=currentIdx}>
              <span className="bk-step-num">{step==="exito"||i<currentIdx?"✓":s.num}</span>
              <span>{s.label}</span>
            </button>
            {i<STEPS.length-1&&<span className="bk-sep"/>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
})()}
```

- [ ] **Step 3: Botones temporales para saltar de paso (testing)**

Reemplazar el placeholder `<p>Paso actual: {step}</p>` con:

```jsx
<div className="space-y-3">
  <p style={{color:'var(--muted)'}}>Paso actual: <strong>{step}</strong></p>
  <div className="flex gap-2 flex-wrap">
    <button onClick={()=>setStep("servicio")} className="btn-ghost px-4 py-2 rounded-lg text-xs">→ Servicio</button>
    <button onClick={()=>setStep("fecha")} className="btn-ghost px-4 py-2 rounded-lg text-xs">→ Fecha</button>
    <button onClick={()=>setStep("datos")} className="btn-ghost px-4 py-2 rounded-lg text-xs">→ Datos</button>
    <button onClick={()=>setStep("exito")} className="btn-ghost px-4 py-2 rounded-lg text-xs">→ Éxito</button>
  </div>
</div>
```

- [ ] **Step 4: Verificar en navegador**

**Checklist:**
- [ ] Título cambia al cambiar paso (Elegí tu servicio / Elegí fecha y horario / Confirmá tu turno / ¡Turno reservado!).
- [ ] Breadcrumb refleja paso actual (círculo relleno olive-dk).
- [ ] Pasos anteriores tienen check ✓ y son clickeables (vuelven a ese paso).
- [ ] Pasos futuros están atenuados y no-clickeables.
- [ ] En "exito", los 3 pasos muestran check.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(web): modal header con título dinámico + breadcrumb de 3 pasos

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Paso 1 — Grilla de servicios

**Files:**
- Modify: `index.html` — reemplazar el placeholder del paso con grilla de cards de servicios.

- [ ] **Step 1: Agregar state para selección de servicio**

En el `<BookingModal/>`, cerca del `const[step,setStep]`:

```jsx
const[selSvc,setSelSvc]=useState(null); // objeto de gf_services
```

- [ ] **Step 2: Agregar CSS para las cards de servicio**

```css
.bk-svc{
  background:rgba(255,255,255,.7);
  border:1.5px solid rgba(0,0,0,.05);
  border-radius:16px;padding:18px;
  cursor:pointer;text-align:left;
  transition:all .25s cubic-bezier(.22,1,.36,1);
}
.bk-svc:hover{transform:translateY(-2px);border-color:rgba(94,107,46,.3);box-shadow:0 8px 24px rgba(94,107,46,.08)}
.bk-svc.sel{border-color:var(--olive-dk);background:rgba(94,107,46,.04)}
```

- [ ] **Step 3: Renderizar grilla de servicios cuando `step==="servicio"`**

Reemplazar el placeholder (los botones `→ Servicio` etc) por:

```jsx
{step==="servicio"&&(
  <div className="space-y-3">
    {svcs.length===0?(
      <p className="text-sm text-center py-8" style={{color:'var(--muted)'}}>Cargando servicios...</p>
    ):(
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {svcs.map(s=>{
          const sel=selSvc?.id===s.id;
          return(
            <button key={s.id} type="button" className={"bk-svc"+(sel?" sel":"")} onClick={()=>{setSelSvc(s);setStep("fecha")}}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-sm font-semibold" style={{color:'var(--ink)'}}>{s.name}</span>
                <span className="text-xs flex-shrink-0 px-2 py-0.5 rounded-full" style={{background:'rgba(94,107,46,.08)',color:'var(--olive-dk)'}}>{s.duration_minutes||60} min</span>
              </div>
              <p className="text-sm font-medium mb-1" style={{color:'var(--olive)'}}>{fP(s.price)}</p>
              {s.description&&<p className="text-xs font-light leading-relaxed line-clamp-2" style={{color:'var(--muted)'}}>{s.description}</p>}
            </button>
          );
        })}
      </div>
    )}
  </div>
)}
{step==="fecha"&&<p style={{color:'var(--muted)'}}>→ Fecha (próxima tarea)</p>}
{step==="datos"&&<p style={{color:'var(--muted)'}}>→ Datos (próxima tarea)</p>}
{step==="exito"&&<p style={{color:'var(--muted)'}}>→ Éxito (próxima tarea)</p>}
```

- [ ] **Step 4: Verificar en navegador**

**Checklist:**
- [ ] Abrir modal muestra grilla de servicios desde DB.
- [ ] Desktop: 2 columnas. Mobile: 1 columna.
- [ ] Cada card muestra nombre, duración (chip), precio, descripción si existe.
- [ ] Hover en desktop: card se eleva.
- [ ] Click en card: selecciona y avanza a "fecha".
- [ ] Click en breadcrumb "Servicio" desde paso "fecha": vuelve al paso 1 con la card seleccionada marcada (borde olive-dk).

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(web): paso 1 del wizard — grilla de servicios con auto-advance

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Paso 2A — Carrusel horizontal de días

**Files:**
- Modify: `index.html` — agregar lógica del carrusel de días Lun-Vie con navegación semanal.

- [ ] **Step 1: Agregar state para fecha seleccionada y offset de semana**

En `<BookingModal/>`:

```jsx
const[selDate,setSelDate]=useState(""); // "YYYY-MM-DD"
const[weekOffset,setWeekOffset]=useState(0); // 0 = semana actual
```

- [ ] **Step 2: Agregar helpers para el carrusel fuera del componente**

Agregar después de `const isWeekday=...` en el bloque de helpers de `<App/>` — **NO, mejor agregarlos como helpers globales cerca de `genSlots`** (aprox. [index.html:134](../../../index.html:134)):

```jsx
const MONTH_ABBR=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const DAY_ABBR=["dom","lun","mar","mié","jue","vie","sáb"];

// Lunes a Viernes de la semana que contiene la fecha `d`, offset en semanas
const weekDays=(baseDate,offset)=>{
  const d=new Date(baseDate+"T12:00:00");
  const dow=d.getDay(); // 0=dom, 1=lun, ...
  const mondayDiff=dow===0?-6:1-dow;
  d.setDate(d.getDate()+mondayDiff+offset*7);
  const days=[];
  for(let i=0;i<5;i++){
    const day=new Date(d);day.setDate(d.getDate()+i);
    const iso=day.getFullYear()+'-'+String(day.getMonth()+1).padStart(2,'0')+'-'+String(day.getDate()).padStart(2,'0');
    days.push({iso,dow:day.getDay(),day:day.getDate(),month:day.getMonth()});
  }
  return days;
};

// Devuelve true si el día tiene al menos un slot disponible dado duración y bloqueos
const dayHasSlots=(iso,dur,blocks,minDate)=>{
  if(iso<minDate)return false;
  const slots=genSlots(dur);
  for(const t of slots){
    const sMin=toMin(t),eMin=sMin+dur;
    let blocked=false;
    for(const b of blocks){
      if(blockCoversSlot(b,iso,sMin,eMin)){blocked=true;break}
    }
    if(!blocked)return true;
  }
  return false;
};
```

- [ ] **Step 3: Agregar CSS para los pills del carrusel**

```css
.bk-daypill{
  flex:1;min-width:0;
  display:flex;flex-direction:column;align-items:center;gap:2px;
  padding:10px 4px;border-radius:14px;
  background:rgba(94,107,46,.06);
  border:1.5px solid transparent;
  cursor:pointer;transition:all .2s;
  font-size:11px;
}
.bk-daypill:hover:not(.dis){background:rgba(94,107,46,.12)}
.bk-daypill.sel{background:var(--olive-dk);color:#fff}
.bk-daypill.sel .bk-day-num{color:#fff}
.bk-daypill.dis{background:rgba(0,0,0,.03);color:rgba(0,0,0,.25);cursor:not-allowed}
.bk-daypill.dis .bk-day-num{color:rgba(0,0,0,.25)}
.bk-day-month{text-transform:lowercase;opacity:.6;font-size:10px}
.bk-day-dow{text-transform:lowercase;font-weight:500}
.bk-day-num{font-size:18px;font-weight:600;color:var(--olive-dk);line-height:1}
.bk-weekarrow{
  width:32px;height:32px;border-radius:10px;
  display:flex;align-items:center;justify-content:center;
  background:rgba(94,107,46,.08);border:none;cursor:pointer;transition:all .2s;
}
.bk-weekarrow:hover:not(:disabled){background:rgba(94,107,46,.15)}
.bk-weekarrow:disabled{opacity:.3;cursor:not-allowed}
```

- [ ] **Step 4: Renderizar el carrusel cuando `step==="fecha"`**

Reemplazar `{step==="fecha"&&<p...>}` por:

```jsx
{step==="fecha"&&(()=>{
  const today=new Date().toLocaleDateString("sv",{timeZone:"America/Argentina/Buenos_Aires"});
  const mDate=(()=>{const d=new Date(today+"T12:00:00");d.setDate(d.getDate()+1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})();
  const days=weekDays(today,weekOffset);
  const dur=selSvc?.duration_minutes||60;
  return(
    <div>
      {/* Carrusel de días */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <button className="bk-weekarrow" onClick={()=>setWeekOffset(o=>Math.max(0,o-1))} disabled={weekOffset<=0} aria-label="Semana anterior">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--olive-dk)" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="flex gap-1.5 flex-1 min-w-0">
            {days.map(d=>{
              const disabled=!dayHasSlots(d.iso,dur,blocks,mDate);
              const sel=selDate===d.iso;
              return(
                <button key={d.iso} type="button" className={"bk-daypill"+(sel?" sel":"")+(disabled?" dis":"")} disabled={disabled} onClick={()=>!disabled&&setSelDate(d.iso)}>
                  <span className="bk-day-month">{MONTH_ABBR[d.month]}</span>
                  <span className="bk-day-dow">{DAY_ABBR[d.dow]}</span>
                  <span className="bk-day-num">{d.day}</span>
                </button>
              );
            })}
          </div>
          <button className="bk-weekarrow" onClick={()=>setWeekOffset(o=>Math.min(8,o+1))} disabled={weekOffset>=8} aria-label="Semana siguiente">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--olive-dk)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
      </div>
      {/* Slots (siguiente tarea) */}
      {selDate?<p className="text-xs text-center" style={{color:'var(--muted)'}}>→ Slots (próxima tarea) — {selDate}</p>:<p className="text-xs text-center" style={{color:'var(--muted)'}}>Elegí un día</p>}
    </div>
  );
})()}
```

- [ ] **Step 5: Verificar en navegador**

**Checklist:**
- [ ] Al entrar al paso 2, aparecen 5 pills (Lun-Vie de la semana actual).
- [ ] Cada pill muestra mes/día-de-semana/número.
- [ ] Días pasados o bloqueados aparecen con opacidad reducida.
- [ ] Click en día disponible: fondo olive-dk y texto blanco.
- [ ] Flecha derecha avanza una semana. Flecha izquierda vuelve.
- [ ] Al ir a semana 0 (actual), flecha izquierda queda deshabilitada.
- [ ] Al ir a semana +8, flecha derecha queda deshabilitada.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(web): paso 2A — carrusel horizontal de días Lun-Vie con navegación semanal

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Paso 2B — Slots agrupados Mañana/Tarde

**Files:**
- Modify: `index.html` — agregar fetch de gf_appointments y render de slots agrupados.

- [ ] **Step 1: Agregar state y efecto para fetch de takenSlots**

En `<BookingModal/>`, después de `const[selDate,setSelDate]=useState("");`:

```jsx
const[takenSlots,setTakenSlots]=useState([]);
const[loadingSlots,setLoadingSlots]=useState(false);

useEffect(()=>{
  if(!selDate||!sb){setTakenSlots([]);return}
  let cancelled=false;
  setLoadingSlots(true);
  sb.from("gf_appointments").select("time_slot,service_id,status").eq("appointment_date",selDate)
    .then(({data})=>{if(!cancelled){setTakenSlots(data||[]);setLoadingSlots(false)}})
    .catch(()=>{if(!cancelled){setTakenSlots([]);setLoadingSlots(false)}});
  return()=>{cancelled=true};
},[selDate]);
```

- [ ] **Step 2: Agregar state para slot seleccionado**

```jsx
const[selTime,setSelTime]=useState(""); // "HH:MM"
```

- [ ] **Step 3: Agregar CSS para los slots**

```css
.bk-slot{
  padding:10px 0;border-radius:12px;
  border:1.5px solid rgba(94,107,46,.12);
  background:rgba(255,255,255,.7);
  font-size:13px;font-weight:500;color:var(--olive-dk);
  cursor:pointer;transition:all .2s;
}
.bk-slot:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 4px 12px rgba(94,107,46,.12)}
.bk-slot.sel{background:var(--olive-dk);color:#fff;border-color:var(--olive-dk);box-shadow:0 6px 16px rgba(61,74,24,.2)}
.bk-slot:disabled{opacity:.35;cursor:not-allowed;background:rgba(0,0,0,.02);border-color:transparent}
.bk-slot-group{font-size:11px;font-weight:500;text-transform:lowercase;letter-spacing:.05em;color:var(--muted);display:flex;align-items:center;gap:6px;margin-bottom:10px;margin-top:4px}
```

- [ ] **Step 4: Helper para formatear hora sin ceros**

Agregar en el bloque global de helpers (cerca de `toHHMM`):

```jsx
const shortHM=hhmm=>{const[h,m]=hhmm.split(":");return `${parseInt(h,10)}:${m}`};
```

- [ ] **Step 5: Renderizar slots agrupados**

Reemplazar el placeholder `{selDate?<p...>:...}` por:

```jsx
{selDate&&(()=>{
  if(loadingSlots)return <p className="text-xs text-center py-4" style={{color:'var(--muted)'}}>Cargando horarios...</p>;
  const allSlots=genSlots(dur);
  const available=allSlots.map(t=>({t,ok:slotAvailable(t,dur,takenSlots,svcs,blocks,selDate)}));
  const morning=available.filter(s=>toMin(s.t)<13*60);
  const afternoon=available.filter(s=>toMin(s.t)>=13*60);
  const renderGroup=(label,icon,items)=>items.length===0?null:(
    <div>
      <div className="bk-slot-group">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        <span>{label}</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-5">
        {items.map(({t,ok})=>{
          const sel=selTime===t;
          return <button key={t} type="button" className={"bk-slot"+(sel?" sel":"")} disabled={!ok} onClick={()=>{if(ok){setSelTime(t);setStep("datos")}}}>{shortHM(t)} hs</button>;
        })}
      </div>
    </div>
  );
  const anyAvailable=available.some(s=>s.ok);
  if(!anyAvailable)return <p className="text-xs text-center py-4" style={{color:'var(--muted)'}}>Este día no tiene horarios disponibles.</p>;
  return(
    <div>
      {renderGroup("Por la mañana",null,morning)}
      {renderGroup("Por la tarde",null,afternoon)}
    </div>
  );
})()}
```

- [ ] **Step 6: Verificar en navegador**

**Checklist:**
- [ ] Al elegir un día, aparecen dos secciones ("Por la mañana" / "Por la tarde") con slots en grillas.
- [ ] Desktop: 4 columnas por fila. Mobile: 3 columnas.
- [ ] Slots ocupados aparecen con opacidad 0.35 y no son clickeables.
- [ ] Click en slot disponible: fondo olive-dk, texto blanco.
- [ ] Al seleccionar un slot, el paso avanza a "datos" automáticamente.
- [ ] Si cambiás de día, `selTime` se limpia (o al menos no muestra slot seleccionado del día anterior).
- [ ] Usar un servicio largo (120 min) → la grilla muestra menos slots (genSlots limita por duración).

- [ ] **Step 7: Limpiar selTime al cambiar de día**

En el efecto que fetch-ea takenSlots, reset de selTime. Actualizar:

```jsx
useEffect(()=>{
  if(!selDate||!sb){setTakenSlots([]);return}
  setSelTime(""); // <-- agregar esta línea
  let cancelled=false;
  setLoadingSlots(true);
  // ... resto igual
```

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "feat(web): paso 2B — slots agrupados Mañana/Tarde con fetch por fecha

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: Paso 3 — Cards de resumen con "Modificar"

**Files:**
- Modify: `index.html` — renderizar dos cards resumen arriba del form de datos.

- [ ] **Step 1: Agregar CSS para las cards de resumen**

```css
.bk-sum{
  background:rgba(94,107,46,.04);
  border:1px solid rgba(94,107,46,.1);
  border-radius:14px;padding:12px 14px;
  display:flex;align-items:center;justify-content:space-between;
  gap:10px;
}
.bk-sum-body{flex:1;min-width:0}
.bk-sum-label{font-size:10px;text-transform:uppercase;letter-spacing:.15em;color:var(--muted);font-weight:500;margin-bottom:2px}
.bk-sum-val{font-size:13px;color:var(--ink);font-weight:500;line-height:1.3}
.bk-sum-mod{
  font-size:11px;color:var(--olive-dk);font-weight:500;
  padding:4px 10px;border-radius:999px;
  background:rgba(94,107,46,.08);border:none;cursor:pointer;
  transition:all .2s;flex-shrink:0;
}
.bk-sum-mod:hover{background:rgba(94,107,46,.15)}
```

- [ ] **Step 2: Renderizar cards resumen cuando `step==="datos"`**

Reemplazar `{step==="datos"&&<p...>}` por:

```jsx
{step==="datos"&&(()=>{
  const dateDisplay=selDate?new Date(selDate+"T12:00:00").toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"}):"";
  const dur=selSvc?.duration_minutes||60;
  const[sh,sm]=selTime.split(":").map(Number);
  const eMin=sh*60+sm+dur;
  const endStr=`${String(Math.floor(eMin/60)).padStart(2,'0')}:${String(eMin%60).padStart(2,'0')}`;
  return(
    <div className="space-y-3">
      {/* Cards resumen */}
      <div className="space-y-2">
        <div className="bk-sum">
          <div className="bk-sum-body">
            <div className="bk-sum-label">Servicio</div>
            <div className="bk-sum-val">{selSvc?.name} · {selSvc?.duration_minutes||60} min · {fP(selSvc?.price||0)}</div>
          </div>
          <button type="button" className="bk-sum-mod" onClick={()=>setStep("servicio")}>Modificar</button>
        </div>
        <div className="bk-sum">
          <div className="bk-sum-body">
            <div className="bk-sum-label">Fecha y horario</div>
            <div className="bk-sum-val">{dateDisplay} · {shortHM(selTime)} → {shortHM(endStr)} hs</div>
          </div>
          <button type="button" className="bk-sum-mod" onClick={()=>setStep("fecha")}>Modificar</button>
        </div>
      </div>
      {/* Form (próxima tarea) */}
      <p className="text-xs text-center py-4" style={{color:'var(--muted)'}}>→ Form de datos (próxima tarea)</p>
    </div>
  );
})()}
```

- [ ] **Step 3: Verificar en navegador**

**Checklist:**
- [ ] Flow completo: elegir servicio → día → slot → aparecen cards de resumen.
- [ ] Card "Servicio" muestra nombre · duración · precio.
- [ ] Card "Fecha y horario" muestra fecha en español · hora inicio → hora fin.
- [ ] Click en "Modificar" del servicio: vuelve al paso 1 con selección preservada.
- [ ] Click en "Modificar" de fecha/horario: vuelve al paso 2 con día y slot preservados.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(web): paso 3 — cards de resumen con Modificar

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Form con nombre, email y WhatsApp (country picker)

**Files:**
- Modify: `index.html` — agregar form fields al paso 3 con selector de país para WhatsApp.

- [ ] **Step 1: Agregar constante global con países**

Agregar al bloque de helpers globales (cerca de `EMAIL_TYPOS`):

```jsx
const COUNTRIES=[
  {code:"AR",prefix:"+549",flag:"🇦🇷",digits:10,placeholder:"2317 40-1234"},
  {code:"UY",prefix:"+598",flag:"🇺🇾",digits:8,placeholder:"9 123 4567"},
  {code:"CL",prefix:"+56", flag:"🇨🇱",digits:9,placeholder:"9 1234 5678"},
  {code:"BR",prefix:"+55", flag:"🇧🇷",digits:11,placeholder:"11 91234 5678"},
  {code:"ES",prefix:"+34", flag:"🇪🇸",digits:9,placeholder:"612 345 678"},
  {code:"US",prefix:"+1",  flag:"🇺🇸",digits:10,placeholder:"212 555 1234"},
  {code:"MX",prefix:"+52", flag:"🇲🇽",digits:10,placeholder:"55 1234 5678"},
];
```

- [ ] **Step 2: Agregar state de form en el modal**

En `<BookingModal/>`:

```jsx
const[fm,setFm]=useState({n:"",em:"",ph:"",country:"AR"});
const[emailSuggestion,setEmailSuggestion]=useState("");
const[submitting,setSubmitting]=useState(false);
const[submitError,setSubmitError]=useState("");
```

- [ ] **Step 3: Reemplazar el placeholder del form por los fields**

Reemplazar `<p>→ Form de datos...</p>` por:

```jsx
<form onSubmit={e=>{e.preventDefault()}} className="space-y-4">
  <div>
    <label className="text-[10px] uppercase tracking-[.2em] block mb-2 font-medium" style={{color:'var(--muted)',opacity:.5}}>Nombre completo</label>
    <input type="text" autoComplete="name" value={fm.n} onChange={e=>setFm(p=>({...p,n:e.target.value}))} className="field w-full px-4 py-3 rounded-xl text-sm" placeholder="María García" required maxLength={80}/>
  </div>
  <div>
    <label className="text-[10px] uppercase tracking-[.2em] block mb-2 font-medium" style={{color:'var(--muted)',opacity:.5}}>Email</label>
    <input type="email" autoComplete="email" value={fm.em} onChange={e=>{setFm(p=>({...p,em:e.target.value}));setEmailSuggestion(suggestEmail(e.target.value)||"")}} className="field w-full px-4 py-3 rounded-xl text-sm" placeholder="maria@email.com" required maxLength={120}/>
    {emailSuggestion&&<p className="text-xs mt-1.5" style={{color:'#92400E'}}>¿Quisiste decir <button type="button" onClick={()=>{setFm(p=>({...p,em:emailSuggestion}));setEmailSuggestion("")}} className="font-semibold underline">{emailSuggestion}</button>?</p>}
  </div>
  <div>
    <label className="text-[10px] uppercase tracking-[.2em] block mb-2 font-medium" style={{color:'var(--muted)',opacity:.5}}>WhatsApp</label>
    <div className="flex gap-2">
      <select value={fm.country} onChange={e=>setFm(p=>({...p,country:e.target.value}))} className="field px-3 py-3 rounded-xl text-sm cursor-pointer" style={{flex:'0 0 auto'}}>
        {COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.prefix}</option>)}
      </select>
      <input type="tel" inputMode="numeric" autoComplete="tel-national" value={fm.ph} onChange={e=>setFm(p=>({...p,ph:e.target.value.replace(/[^\d\s\-]/g,'')}))} className="field flex-1 px-4 py-3 rounded-xl text-sm" placeholder={COUNTRIES.find(c=>c.code===fm.country)?.placeholder||""} required maxLength={20}/>
    </div>
  </div>
  {submitError&&<p className="text-xs text-center py-2 px-4 rounded-xl" style={{background:'#fef2f2',color:'#991b1b',border:'1px solid #fecaca'}}>{submitError}</p>}
  <button type="submit" disabled={submitting} className="w-full text-sm font-medium py-3.5 rounded-xl text-white flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:opacity-50" style={{background:'var(--olive-dk)'}}>
    {submitting?"Reservando...":"Confirmar reserva"}
  </button>
  <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-[11px] leading-relaxed" style={{background:'rgba(94,107,46,.06)',border:'1px solid rgba(94,107,46,.1)',color:'var(--muted)'}}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--olive)" strokeWidth="1.8" strokeLinecap="round" className="flex-shrink-0 mt-px"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
    <span><strong style={{color:'var(--olive-dk)'}}>Cancelación:</strong> avisanos por WhatsApp con al menos 4 hs de anticipación.</span>
  </div>
</form>
```

- [ ] **Step 4: Verificar en navegador**

**Checklist:**
- [ ] Form muestra 3 fields + submit + cancelación.
- [ ] Selector de país muestra 7 opciones con banderas y prefijos. Default AR.
- [ ] Placeholder del teléfono cambia al cambiar de país.
- [ ] Escribir letras en el teléfono: las ignora, solo permite dígitos/espacios/guiones.
- [ ] Escribir "gmial.com" en el email muestra sugerencia "gmail.com".
- [ ] Submit aún no hace nada (solo previene default).

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(web): paso 3 form — nombre, email, WhatsApp con country picker

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Submit y pantalla de éxito

**Files:**
- Modify: `index.html` — portar la lógica de `sub()` al modal y renderizar pantalla de éxito.

- [ ] **Step 1: Agregar state para sentData en el modal**

En `<BookingModal/>`:

```jsx
const[sentData,setSentData]=useState(null);
```

- [ ] **Step 2: Helper para normalizar teléfono con el prefijo elegido**

Agregar en el bloque global de helpers:

```jsx
const normPhoneByCountry=(raw,countryCode)=>{
  const c=COUNTRIES.find(x=>x.code===countryCode);
  if(!c)return raw;
  const digits=(raw||"").replace(/\D/g,'');
  return `${c.prefix} ${digits}`;
};
```

- [ ] **Step 3: Reemplazar el `onSubmit` del form con la lógica real**

Reemplazar `<form onSubmit={e=>{e.preventDefault()}}...>` por `<form onSubmit={handleSubmit}...>` y agregar antes del return:

```jsx
const handleSubmit=async(e)=>{
  e.preventDefault();setSubmitError("");
  const{n,em,ph,country}=fm;
  if(!n||!em||!ph||!selSvc||!selDate||!selTime){setSubmitError("Completá todos los campos.");return}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.trim())){setSubmitError("Ingresá un email válido.");return}
  const digits=ph.replace(/\D/g,'');
  if(digits.length<7){setSubmitError("Ingresá un número de teléfono válido.");return}
  if(!sb){setSubmitError("Error de conexión. Intentá de nuevo.");return}
  setSubmitting(true);
  try{
    const{data:freshSlots}=await sb.from("gf_appointments").select("time_slot,service_id,status").eq("appointment_date",selDate);
    if(freshSlots&&freshSlots.some(r=>r.time_slot===selTime&&r.status!=="cancelled")){
      setTakenSlots(freshSlots);setSelTime("");setSubmitError("Ese horario acaba de ser reservado. Elegí otro.");
      setSubmitting(false);setStep("fecha");return;
    }
    const phoneFmt=normPhoneByCountry(ph,country);
    const{error}=await sb.from("gf_appointments").insert({
      client_name:n.trim(),client_email:em.trim(),client_phone:phoneFmt,
      service_id:selSvc.id,appointment_date:selDate,time_slot:selTime,status:"pending"
    });
    if(error){
      if(error.code==="23505"){setSubmitError("Ese horario acaba de ser reservado. Elegí otro.");setTakenSlots(p=>[...p,{time_slot:selTime,service_id:selSvc.id,status:"pending"}]);setSelTime("");setStep("fecha");}
      else{setSubmitError("Error al reservar. Intentá de nuevo.");}
      setSubmitting(false);return;
    }
    const df=new Date(selDate+"T12:00:00").toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"});
    try{
      await fetch(`${SB_URL}/functions/v1/notify-booking`,{
        method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY},
        body:JSON.stringify({nombre:n.trim(),email:em.trim(),telefono:phoneFmt,servicio:selSvc.name,fecha:df,horario:selTime,precio:fP(selSvc.price)})
      });
    }catch(e){console.warn("notify-booking failed",e)}
    setSentData({nombre:n.trim(),servicio:selSvc.name,fecha:df,horario:selTime,precio:fP(selSvc.price),fecha_raw:selDate,dur_min:selSvc.duration_minutes||60});
    setSubmitting(false);setStep("exito");
  }catch(err){
    setSubmitError("Error de conexión. Intentá de nuevo.");setSubmitting(false);
  }
};

const resetWizard=()=>{
  setStep("servicio");setSelSvc(null);setSelDate("");setSelTime("");
  setFm({n:"",em:"",ph:"",country:"AR"});setSentData(null);setSubmitError("");setEmailSuggestion("");
};
```

- [ ] **Step 4: Renderizar pantalla de éxito**

Reemplazar `{step==="exito"&&<p...>}` por:

```jsx
{step==="exito"&&sentData&&(
  <div className="text-center">
    <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center" style={{background:'rgba(37,211,102,.08)'}}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="#25D366"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
    </div>
    <h3 className="mb-2" style={{fontFamily:'Playfair Display,serif',fontSize:'1.6rem',color:'var(--ink)'}}>¡Turno reservado!</h3>
    <div className="text-left rounded-2xl p-5 mb-5 space-y-2" style={{background:'var(--sand)',border:'1px solid rgba(94,107,46,.08)'}}>
      {[["Servicio",sentData.servicio],["Fecha",sentData.fecha],["Horario",sentData.horario+" hs"],["Precio",sentData.precio]].map(([k,v])=>
        <div key={k} className="flex justify-between items-center">
          <span className="text-xs font-light" style={{color:'var(--muted)'}}>{k}</span>
          <span className="text-xs font-medium" style={{color:'var(--ink)'}}>{v}</span>
        </div>
      )}
    </div>
    <p className="text-xs font-light mb-5" style={{color:'var(--muted)'}}>Recibimos tu reserva. Te confirmamos por WhatsApp a la brevedad.</p>
    <div className="flex flex-col gap-2 mb-5">
      <button onClick={()=>downloadICS(sentData)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-80" style={{background:'var(--olive-dk)',color:'#fff'}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        Agregar al calendario
      </button>
      <a href="https://maps.google.com/?q=Hip%C3%B3lito+Yrigoyen+229+Henderson+Buenos+Aires" target="_blank" rel="noopener" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-80" style={{background:'rgba(94,107,46,.08)',color:'var(--olive-dk)'}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        Cómo llegar
      </a>
      <a href={`https://api.whatsapp.com/send?phone=${WA_GUADA}&text=${encodeURIComponent("Hola! Quiero reagendar mi turno en GF Studio.")}`} target="_blank" rel="noopener" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-80" style={{background:'#25D366',color:'#fff'}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        Reagendar por WhatsApp
      </a>
    </div>
    <button onClick={resetWizard} className="btn-ghost text-xs px-6 py-2.5 rounded-full">Reservar otro turno</button>
  </div>
)}
```

- [ ] **Step 5: Verificar flujo completo**

**Checklist:**
- [ ] Completar todo el wizard → click en "Confirmar reserva".
- [ ] Se inserta el turno en DB (verificar en admin o en Supabase dashboard).
- [ ] Se envía el email al admin (verificar Resend logs).
- [ ] Pantalla de éxito aparece con resumen + ICS + Cómo llegar + WhatsApp.
- [ ] Click en "Reservar otro turno" reinicia el wizard (paso 1, limpio).
- [ ] Test de colisión: abrir dos ventanas, reservar el mismo slot en ambas → la segunda debe fallar con error "Ese horario acaba de ser reservado".
- [ ] Email con typo ("maria@gmial.com") muestra sugerencia.
- [ ] Teléfono inválido (menos de 7 dígitos) muestra error en submit.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(web): submit con colisión detection + pantalla de éxito en modal

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: Deep link ?book=1 y ?book=1&svc=ID

**Files:**
- Modify: `index.html` — leer query params al mount, permitir pre-seleccionar servicio, limpiar URL al cerrar.

- [ ] **Step 1: Efecto en `<App/>` que lee URL params al mount**

En `<App/>`, después del useEffect que fetch-ea svcs y blocks, agregar:

```jsx
const[initialSvcId,setInitialSvcId]=useState(null);

useEffect(()=>{
  const p=new URLSearchParams(window.location.search);
  if(p.get("book")==="1"){
    setBk(true);
    const svcParam=p.get("svc");
    if(svcParam)setInitialSvcId(parseInt(svcParam,10));
  }
},[]);
```

- [ ] **Step 2: Pasar `initialServiceId` al modal**

Actualizar el render del `<BookingModal/>`:

```jsx
<BookingModal
  open={bk}
  onClose={()=>{setBk(false);setInitialSvcId(null);history.replaceState(null,"","/")}}
  svcs={svcs}
  blocks={blocks}
  initialServiceId={initialSvcId}
/>
```

- [ ] **Step 3: En `<BookingModal/>`, usar `initialServiceId` al montar**

Reemplazar el `useState("servicio")` del step con un init basado en initialServiceId + un efecto:

```jsx
const[step,setStep]=useState("servicio");
const[selSvc,setSelSvc]=useState(null);

useEffect(()=>{
  if(!open||!initialServiceId||!svcs.length)return;
  const s=svcs.find(x=>x.id===initialServiceId);
  if(s){setSelSvc(s);setStep("fecha")}
},[open,initialServiceId,svcs]);
```

- [ ] **Step 4: Verificar en navegador**

**Checklist:**
- [ ] Abrir [http://localhost:8080/?book=1](http://localhost:8080/?book=1) → modal abre directamente en paso 1.
- [ ] Abrir [http://localhost:8080/?book=1&svc=15](http://localhost:8080/?book=1&svc=15) (reemplazar 15 con un id de servicio real) → modal abre en paso 2 con servicio pre-seleccionado.
- [ ] Abrir [http://localhost:8080/?book=1&svc=99999](http://localhost:8080/?book=1&svc=99999) (id inexistente) → modal abre en paso 1 sin selección.
- [ ] Cerrar el modal → URL queda limpia en `/` (sin `?book=1`).

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(web): deep link ?book=1 y ?book=1&svc=ID para IG bio

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 10: Wire up triggers y eliminar sección #reservar vieja

**Files:**
- Modify: `index.html` — cambiar botones del nav y hero, eliminar sección `#reservar` y state no usado.

- [ ] **Step 1: Actualizar botones del nav desktop**

En el nav ([index.html:358-365](../../../index.html:358)):

Cambiar:
```jsx
{[{id:"servicios",l:"Servicios"},{id:"reservar",l:"Turnos"},{id:"contacto",l:"Contacto"}].map(x=>
  <button key={x.id} onClick={()=>go(x.id)} className="text-[13px] font-light tracking-wide transition-colors hover:text-[var(--olive-dk)]" style={{color:'var(--muted)'}}>{x.l}</button>
)}
<button onClick={()=>{setBk(true);setTimeout(()=>go("reservar"),100)}} className="btn-primary text-[13px] font-medium px-7 py-2.5 rounded-full">Reservar turno</button>
```

Por:
```jsx
{[{id:"servicios",l:"Servicios"},{id:"contacto",l:"Contacto"}].map(x=>
  <button key={x.id} onClick={()=>go(x.id)} className="text-[13px] font-light tracking-wide transition-colors hover:text-[var(--olive-dk)]" style={{color:'var(--muted)'}}>{x.l}</button>
)}
<button onClick={()=>setBk(true)} className="btn-primary text-[13px] font-medium px-7 py-2.5 rounded-full">Reservar turno</button>
```

(Sacamos "Turnos" del nav porque ya no hay sección; el botón "Reservar turno" es el único CTA.)

- [ ] **Step 2: Actualizar nav mobile**

Similar en el bloque del nav mobile ([index.html:370-376](../../../index.html:370)):

Cambiar a:
```jsx
{[{id:"servicios",l:"Servicios"},{id:"contacto",l:"Contacto"}].map(x=>
  <button key={x.id} onClick={()=>go(x.id)} className="block w-full text-left text-sm py-3 px-3 rounded-xl transition-colors hover:bg-[rgba(94,107,46,.05)] capitalize font-light" style={{color:'var(--muted)'}}>{x.l}</button>
)}
<button onClick={()=>{setBk(true);setMn(false)}} className="btn-primary w-full text-sm font-medium py-3.5 rounded-full mt-2">Reservar Turno</button>
```

- [ ] **Step 3: Actualizar CTA del hero**

En el hero, buscar el botón "Reservar Turno" (cerca de [index.html:415](../../../index.html:415)) — verificar que el botón primario abra el modal:

```jsx
<button onClick={()=>setBk(true)} className="btn-primary text-sm font-medium px-12 py-4 rounded-full w-full sm:w-auto">
  Reservar turno
</button>
```

(Si el hero tiene un botón "Ver servicios" que hace scroll, ese queda como está.)

- [ ] **Step 4: Eliminar completamente la sección `#reservar`**

Buscar `{/* ══════ BOOKING ══════ */}` o `id="reservar"` y eliminar todo el bloque `<section id="reservar">...</section>` (de aprox. [index.html:480](../../../index.html:480) al cierre de `</section>` que está antes de `/* ══════ CONTACT ══════ */`).

Esto elimina unas 170 líneas.

- [ ] **Step 5: Limpiar state y funciones no usadas en `<App/>`**

Del `<App/>`, eliminar:
- `const[fm,setFm]=useState(...)` — ya no se usa.
- `const[sent,setSent]=useState(false)` — ya no se usa.
- `const[sentData,setSentData]=useState(null)` — ya no se usa.
- `const[takenSlots,setTakenSlots]=useState([])` — ya no se usa.
- `const[loadingSlots,setLoadingSlots]=useState(false)` — ya no se usa.
- `const[submitting,setSubmitting]=useState(false)` — ya no se usa.
- `const[submitError,setSubmitError]=useState("")` — ya no se usa.
- `const[dateError,setDateError]=useState("")` — ya no se usa.
- `const[expandedSvc,setExpandedSvc]=useState(null)` — ya no se usa.
- `const[emailSuggestion,setEmailSuggestion]=useState("")` — ya no se usa.
- Función `fetchSlots` completa.
- Efecto `useEffect(()=>{fetchSlots(fm.dt);...},[fm.dt,fetchSlots])`.
- Función `sub` completa.
- Helpers usados solo por `sub`: `validPhone`, `normPhone` (si no se usan en el modal — el modal tiene `normPhoneByCountry`, así que se pueden borrar).
- `minD` y `isWeekday` — verificar si se usan en otro lado antes de borrar.

Dejar en `<App/>` solo:
- `bk`, `setBk`
- `mn`, `setMn`
- `scrolled`, `setScrolled`
- `svcs`, `setSvcs`
- `blocks`, `setBlocks`
- `loadingSvcs`, `setLoadingSvcs`
- `initialSvcId`, `setInitialSvcId`
- Efectos de scroll, reveal, fetch inicial de svcs+blocks, y URL params.
- Función `go`.

- [ ] **Step 6: Verificar que no hay referencias rotas**

Abrir devtools → consola del navegador. Cargar la página. No debe haber errores de "X is not defined" o referencias a state eliminado.

Si hay errores, buscar el símbolo con Grep en [index.html](../../../index.html) y eliminar/arreglar.

- [ ] **Step 7: Verificar en navegador**

**Checklist:**
- [ ] Nav desktop muestra "Servicios" y "Contacto" (sin "Turnos") + botón "Reservar turno".
- [ ] Nav mobile muestra lo mismo.
- [ ] Click en "Reservar turno" (nav desktop, nav mobile, hero): abre modal.
- [ ] No existe la sección vieja `#reservar` en el landing (scroll al final: servicios → contacto → footer).
- [ ] Footer, contacto y servicios se renderizan normalmente.
- [ ] Console del navegador: sin errores.
- [ ] Flow completo del modal sigue funcionando.

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "refactor(web): eliminar sección #reservar vieja + cleanup de state no usado

Triggers del nav y hero abren el modal. Nav pierde el item Turnos
(redundante con el CTA principal). ~170 líneas eliminadas.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 11: Confirm dialog al cerrar con datos a medio llenar

**Files:**
- Modify: `index.html` — agregar chequeo de "datos dirty" antes de cerrar.

- [ ] **Step 1: Agregar función `handleClose` al modal**

Dentro de `<BookingModal/>`:

```jsx
const isDirty=()=>{
  if(step==="exito")return false;
  return !!(selSvc||selDate||selTime||fm.n||fm.em||fm.ph);
};
const handleClose=()=>{
  if(isDirty()&&step!=="exito"){
    if(!window.confirm("¿Descartar reserva? Vas a perder los datos que ya cargaste."))return;
  }
  resetWizard();
  onClose();
};
```

- [ ] **Step 2: Reemplazar todas las llamadas a `onClose` directo por `handleClose`**

- Backdrop: `<div className="bk-backdrop" onClick={handleClose}/>`
- Botón X: `<button onClick={handleClose} ...>`
- useEffect ESC: `if(e.key==="Escape")handleClose()` — **cuidado**: `handleClose` no está en scope del useEffect si se define después. Mover `handleClose` ANTES del `useEffect` de ESC, o usar un ref. Solución simple: redeclarar la lógica dentro del handler ESC o usar useRef.

Solución: usar un ref para evitar stale closures:

```jsx
const handleCloseRef=useRef(null);
handleCloseRef.current=handleClose;

useEffect(()=>{
  if(!open)return;
  const onKey=e=>{if(e.key==="Escape")handleCloseRef.current?.()};
  document.addEventListener("keydown",onKey);
  // ... resto igual
},[open]);
```

- [ ] **Step 3: Verificar en navegador**

**Checklist:**
- [ ] Abrir modal, sin tocar nada → cerrar (X/ESC/backdrop) → cierra sin preguntar.
- [ ] Abrir modal, seleccionar servicio → cerrar → dialog "¿Descartar?".
- [ ] Abrir modal, completar todo hasta éxito → cerrar → cierra sin preguntar.
- [ ] Click "Cancelar" en el dialog → modal sigue abierto.
- [ ] Click "Aceptar" en el dialog → modal cierra y state se resetea.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(web): confirm dialog al cerrar modal con datos a medio llenar

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 12: Transiciones entre pasos + polish final

**Files:**
- Modify: `index.html` — agregar transición CSS entre pasos.

- [ ] **Step 1: Agregar CSS para transiciones**

Agregar al bloque CSS del modal:

```css
.bk-step-body{animation:bkSlide .22s cubic-bezier(.22,1,.36,1) both}
@keyframes bkSlide{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
```

- [ ] **Step 2: Envolver el cuerpo de cada paso en `<div className="bk-step-body" key={step}>`**

En el `<div className="flex-1 overflow-y-auto p-6">`, envolver el contenido:

```jsx
<div className="flex-1 overflow-y-auto p-6">
  <div className="bk-step-body" key={step}>
    {step==="servicio"&&(...)}
    {step==="fecha"&&(...)}
    {step==="datos"&&(...)}
    {step==="exito"&&(...)}
  </div>
</div>
```

(El `key={step}` fuerza a React a re-mount el div al cambiar de paso, disparando la animación.)

- [ ] **Step 3: Verificar en navegador**

**Checklist:**
- [ ] Al cambiar de paso, hay un fade + slide horizontal suave (~220ms).
- [ ] Abrir modal: backdrop fade + panel scale up.
- [ ] Breadcrumb "Modificar" también dispara animación al volver atrás.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "polish(web): transiciones fade+slide entre pasos del wizard

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 13: Verificación final + deploy

**Files:**
- Ninguno — solo testing y deploy.

- [ ] **Step 1: Lista de smoke tests en local**

Usar `mcp__Claude_Preview__preview_start` apuntando a `C:/Users/ALVARO/Documents/2-ClientesIA/gf-studio`.

**Desktop (viewport ≥ 640px):**
- [ ] Landing carga correctamente. Hero, servicios, contacto, footer OK.
- [ ] Nav: "Servicios" scroll, "Contacto" scroll, "Reservar turno" abre modal.
- [ ] Modal 520px centrado con backdrop blur.
- [ ] Flow: elegir servicio → día → slot → datos → confirmar → éxito.
- [ ] ICS download funciona (genera archivo .ics).
- [ ] "Cómo llegar" abre Google Maps.
- [ ] "Reagendar por WhatsApp" abre WA Web con mensaje pre-armado.
- [ ] "Reservar otro turno" vuelve a paso 1.
- [ ] Cerrar modal desde éxito → URL vuelve a `/`.

**Mobile (viewport < 640px, DevTools responsive):**
- [ ] Landing responsive OK.
- [ ] Menú hamburguesa + "Reservar Turno" abre modal fullscreen.
- [ ] Modal ocupa 100% viewport, sin scroll horizontal.
- [ ] Selector de país funciona (tap).
- [ ] Teclado numérico aparece en campo WhatsApp.
- [ ] Scroll interno del modal si contenido excede viewport.

**Deep link:**
- [ ] [/?book=1](http://localhost:8080/?book=1) → modal directo.
- [ ] [/?book=1&svc=ID](http://localhost:8080/?book=1&svc=ID) con ID válido → paso 2.

**Casos edge:**
- [ ] Día completo bloqueado → pill del día gris, no clickeable.
- [ ] Slot ocupado (crear manualmente desde admin o vía Supabase) → slot con opacidad 0.35 deshabilitado.
- [ ] Colisión (dos tabs, mismo slot) → segunda reserva falla con error + vuelve al paso 2.
- [ ] Email con typo → sugerencia.
- [ ] Cerrar con datos a medio llenar → confirm dialog.

**Accesibilidad manual:**
- [ ] Tab desde backdrop-abierto → focus se mantiene dentro del modal.
- [ ] ESC cierra.
- [ ] Screen reader anuncia el diálogo (verificar con narrator/VoiceOver si disponible).

- [ ] **Step 2: Fix de cualquier bug encontrado + commit**

Si se encuentran bugs, crear commits puntuales:
```bash
git commit -m "fix(web): <descripción del fix>"
```

- [ ] **Step 3: Push y deploy a Vercel**

```bash
git push origin main
```

Esperar ~1-2 minutos a que Vercel haga auto-deploy.

- [ ] **Step 4: Smoke test en producción**

Abrir [https://gf-studio.vercel.app](https://gf-studio.vercel.app):
- [ ] Landing carga.
- [ ] Botón "Reservar turno" abre modal.
- [ ] Completar reserva real (con datos de test o dummy): verificar que llega el email a Guada.
- [ ] Deep link [/?book=1](https://gf-studio.vercel.app/?book=1) funciona.
- [ ] Admin [admin.html](https://gf-studio.vercel.app/admin.html) sigue funcionando (entrar, ver que el turno de test apareció).

- [ ] **Step 5: Actualizar link de bio de IG**

Avisar a Alvaro/Guada para actualizar el link en bio de IG a `https://gf-studio.vercel.app/?book=1`.

- [ ] **Step 6: Actualizar memory con estado post-implementación**

Actualizar `project_gf_studio_turnera.md` con el nuevo estado (modal wizard operativo, deep link en bio IG, sección #reservar eliminada).

---

## Self-Review del plan

**Spec coverage:**
- ✅ Modal fullscreen/panel centrado — Task 1, 2
- ✅ State machine 4 modos — Task 2, 3, 4, 5, 6, 7, 8
- ✅ Breadcrumb clickeable — Task 2
- ✅ Paso 1 grilla servicios — Task 3
- ✅ Paso 2 carrusel días — Task 4
- ✅ Paso 2 slots Mañana/Tarde — Task 5
- ✅ Paso 3 cards resumen + form — Task 6, 7
- ✅ Selector de país WhatsApp — Task 7
- ✅ Submit + éxito — Task 8
- ✅ Deep link ?book=1 + ?book=1&svc=ID — Task 9
- ✅ Wire up triggers + eliminar sección vieja — Task 10
- ✅ Confirm dialog al cerrar dirty — Task 11
- ✅ Transiciones entre pasos — Task 12
- ✅ Accesibilidad (role, aria, ESC, focus) — Task 1 + Task 13
- ✅ Body scroll lock — Task 1

**Placeholders:** ninguno, todo el código está provisto.

**Type consistency:**
- `selSvc` es el objeto completo de servicio (con `id`, `name`, `price`, `duration_minutes`, `description`).
- `selDate` es string ISO "YYYY-MM-DD".
- `selTime` es string "HH:MM".
- `fm` es `{n,em,ph,country}`.
- `COUNTRIES` es array de `{code,prefix,flag,digits,placeholder}`.
- Nombres de funciones consistentes: `handleSubmit`, `handleClose`, `resetWizard`.
