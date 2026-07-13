/* shared.js — pure-JS helpers shared between index.html and admin.html.
   Load as <script src="/shared.js"> before the Babel block in both files. */

const fP = n => "$" + (Number(n)||0).toLocaleString("es-AR");
const fDur = m => { const n=Number(m)||0; if(n<60) return n+" min"; const h=Math.floor(n/60), r=n%60; return r===0 ? h+" hs" : h+":"+String(r).padStart(2,'0')+" hs"; };
const toMin = hhmm => { if(!hhmm) return 0; const [h,m]=hhmm.slice(0,5).split(":").map(Number); return h*60+m; };
const toHHMM = m => String(Math.floor(m/60)).padStart(2,'0')+":"+String(m%60).padStart(2,'0');
const toISO = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,'0')+"-"+String(d.getDate()).padStart(2,'0');
const addDays = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const mondayOf = d => { const x=new Date(d); x.setHours(12,0,0,0); const dow=x.getDay(); const diff=dow===0?-6:1-dow; x.setDate(x.getDate()+diff); return x; };

const blockCoversSlot = (block, date, sMin, eMin) => {
  const dow = new Date(date+"T12:00:00").getDay();
  const mb = dow===0 ? 6 : dow-1;
  switch(block.type){
    case "full_day": return block.block_date===date;
    case "datetime_range": {
      if(block.block_date!==date) return false;
      const bs = toMin(block.start_time), be = toMin(block.end_time);
      return bs<eMin && be>sMin;
    }
    case "date_range": return date>=block.date_from && date<=block.date_to;
    case "weekly": {
      if(block.day_of_week!==mb) return false;
      if(block.recurring_from && date<block.recurring_from) return false;
      if(block.recurring_to && date>block.recurring_to) return false;
      if(block.start_time && block.end_time){
        const bs = toMin(block.start_time), be = toMin(block.end_time);
        return bs<eMin && be>sMin;
      }
      return true;
    }
    default: return false;
  }
};

const slotAvailable = (slot, dur, appts, svcs, blocks, date) => {
  const sMin = toMin(slot), eMin = sMin+dur;
  for(const a of appts){
    if(a.status==="cancelled") continue;
    if(a.appointment_date!==date) continue;
    const aMin = toMin(a.time_slot);
    const aDur = (svcs.find(s=>s.id===a.service_id)?.duration_minutes)||60;
    if(aMin<eMin && (aMin+aDur)>sMin) return false;
  }
  for(const b of blocks){ if(blockCoversSlot(b,date,sMin,eMin)) return false; }
  return true;
};
