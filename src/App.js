import { useState, useCallback, useEffect } from "react";

const COLORS = ["#D4A96A","#7BAF8E","#5B8DB8","#C4855A","#8FA656","#A67BAF","#AF7B8A","#6AA8AF"];
const EMOJIS = ["🥗","🍝","🌾","🐟","🌯","🥙","🍱","🥘","🫕","🍛","🥦","🫙"];
const DAYS = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì"];

const FALLBACK_MEALS = [
  { name:"Bowl di Farro con Pollo", kcal:480, prep:25, servings:1, tags:["proteico","cereali"], ingredients:[{name:"Farro perlato",qty:80,unit:"g"},{name:"Petto di pollo",qty:120,unit:"g"},{name:"Zucchine",qty:1,unit:"pz"},{name:"Pomodorini",qty:100,unit:"g"},{name:"Olio EVO",qty:1,unit:"cucchiaio"}], steps:["Cuoci il farro 20 min in acqua salata, scola e raffredda.","Taglia il pollo a cubetti, saltalo con olio e timo 8 min.","Grigliale le zucchine 3-4 min per lato.","Assembla il bowl e condisci con olio e limone.","Conserva in contenitore ermetico fino a 3 giorni."] },
  { name:"Quinoa con Ceci e Feta", kcal:420, prep:15, servings:1, tags:["vegetariano","legumi"], ingredients:[{name:"Quinoa",qty:70,unit:"g"},{name:"Ceci cotti",qty:150,unit:"g"},{name:"Feta",qty:50,unit:"g"},{name:"Cetriolo",qty:0.5,unit:"pz"},{name:"Olio EVO",qty:1,unit:"cucchiaio"}], steps:["Cuoci la quinoa in acqua 2:1 per 15 min, raffredda.","Taglia cetriolo e peperone a cubetti.","Mescola tutto con feta sbriciolata.","Condisci con olio e aceto di mele.","Conserva 3-4 giorni in frigo."] },
  { name:"Riso Integrale con Tonno", kcal:450, prep:20, servings:1, tags:["pesce","omega-3"], ingredients:[{name:"Riso integrale",qty:80,unit:"g"},{name:"Tonno al naturale",qty:130,unit:"g"},{name:"Edamame",qty:80,unit:"g"},{name:"Mais",qty:50,unit:"g"},{name:"Salsa di soia",qty:1,unit:"cucchiaino"}], steps:["Cuoci il riso integrale 30-35 min.","Cuoci gli edamame 3 min.","Spezzetta il tonno con una forchetta.","Assembla con soia e zenzero.","Cospargi di semi di sesamo."] },
  { name:"Wrap con Hummus e Verdure", kcal:380, prep:10, servings:1, tags:["vegano","veloce"], ingredients:[{name:"Tortilla integrale",qty:1,unit:"pz"},{name:"Hummus",qty:80,unit:"g"},{name:"Carote",qty:1,unit:"pz"},{name:"Spinaci",qty:40,unit:"g"},{name:"Avocado",qty:0.5,unit:"pz"}], steps:["Stendi l'hummus sulla tortilla.","Aggiungi spinaci, carote grattugiate e avocado.","Spremi il limone sopra.","Arrotola stretto e taglia a metà.","Avvolgi nella pellicola, si conserva 1 giorno."] },
  { name:"Pasta Lenticchie e Pesto Rucola", kcal:510, prep:20, servings:1, tags:["vegetariano","proteico"], ingredients:[{name:"Pasta di lenticchie",qty:80,unit:"g"},{name:"Rucola",qty:40,unit:"g"},{name:"Parmigiano",qty:20,unit:"g"},{name:"Noci",qty:20,unit:"g"},{name:"Olio EVO",qty:2,unit:"cucchiai"}], steps:["Cuoci la pasta 1 min meno del dovuto.","Frulla rucola, noci, parmigiano e olio.","Condisci la pasta con il pesto.","Aggiungi i ciliegini tagliati.","Conserva 2 giorni in frigo."] },
];

// ── UTILS ──────────────────────────────────────────────────────────────────
function getWeekKey(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const wn = Math.ceil(((d - jan4) / 86400000 + jan4.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(wn).padStart(2,"0")}`;
}

function assignVisuals(meals) {
  return meals.map((m, i) => ({ ...m, id: m.id ?? (Date.now() + i + Math.random()), color: COLORS[i % COLORS.length], emoji: EMOJIS[i % EMOJIS.length] }));
}

function buildShoppingList(plan) {
  const totals = {};
  DAYS.forEach(day => {
    const m = plan[day];
    if (!m) return;
    const s = m.servings || 1;
    (m.ingredients || []).forEach(ing => {
      if (!totals[ing.name]) totals[ing.name] = { name: ing.name, qty: 0, unit: ing.unit };
      totals[ing.name].qty += ing.qty * s;
    });
  });
  return Object.values(totals).map(i => ({ ...i, qty: Math.round(i.qty * 10) / 10 }));
}

function diffLists(prev, curr) {
  const pm = Object.fromEntries((prev||[]).map(i => [i.name, i]));
  const cm = Object.fromEntries((curr||[]).map(i => [i.name, i]));
  return {
    added: curr.filter(i => !pm[i.name]),
    removed: (prev||[]).filter(i => !cm[i.name]),
    changed: curr.filter(i => pm[i.name] && pm[i.name].qty !== i.qty).map(i => ({ ...i, prevQty: pm[i.name].qty }))
  };
}

const emptyPlan = () => Object.fromEntries(DAYS.map(d => [d, null]));

// ── STORAGE: usa localStorage su Vercel, window.storage nell'anteprima Claude ──
const storage = {
  async get(key) {
    // Prova prima window.storage (anteprima Claude)
    if (typeof window !== "undefined" && window.storage) {
      try {
        const r = await window.storage.get(key);
        return r ? JSON.parse(r.value) : null;
      } catch {}
    }
    // Fallback su localStorage (Vercel/browser standard)
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },
  async set(key, val) {
    if (typeof window !== "undefined" && window.storage) {
      try { await window.storage.set(key, JSON.stringify(val)); return; } catch {}
    }
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }
};

// ── API ────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Sei un nutrizionista esperto in meal prep per pranzi di ufficio.
Genera esattamente 5 ricette DIVERSE tra loro per una settimana lavorativa.
Ogni ricetta: preparabile in anticipo, conservabile 3-4 giorni in frigo, max 30 min di prep, equilibrata e sana, trasportabile in contenitore.
Le 5 devono coprire categorie diverse: cereali integrali, legumi, pesce, carne magra, vegano.
IMPORTANTE: Rispondi ESCLUSIVAMENTE con un array JSON valido, nessun testo prima o dopo, nessun markdown.
Ogni elemento: {"name":"string","kcal":number,"prep":number,"tags":["string"],"ingredients":[{"name":"string","qty":number,"unit":"string"}],"steps":["string"]}
qty è sempre riferito a 1 porzione.`;

async function callClaudeAPI(userMsg) {
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  if (!text) throw new Error("Risposta vuota");
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Nessun JSON trovato");
  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Array vuoto");
  return parsed;
}

// ── APP ────────────────────────────────────────────────────────────────────
export default function App() {
  const [weeks, setWeeks] = useState({});
  const [archive, setArchive] = useState([]);
  const [prefs, setPrefs] = useState("");
  const [prefsHistory, setPrefsHistory] = useState([]); // FIX 3: storico preferenze
  const [activeTab, setActiveTab] = useState("current");
  const [view, setView] = useState("planner");
  const [showRecipe, setShowRecipe] = useState(null);
  const [notification, setNotification] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [diffModal, setDiffModal] = useState(null);
  const [archiveDetail, setArchiveDetail] = useState(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const [ready, setReady] = useState(false);
  const [apiError, setApiError] = useState("");
  const [checkedSl, setCheckedSl] = useState({}); // shopping list item checks

  // Load all persisted state on mount
  useEffect(() => {
    Promise.all([
      storage.get("mp-weeks"),
      storage.get("mp-archive"),
      storage.get("mp-prefs"),
      storage.get("mp-prefs-history"),
    ]).then(([w, a, p, ph]) => {
      if (w) setWeeks(w);
      if (a) setArchive(a);
      if (p) setPrefs(p);
      if (ph) setPrefsHistory(ph);
      setReady(true);
    });
  }, []);

  const persist = useCallback((newWeeks, newArchive, newPrefs, newPrefsHistory) => {
    storage.set("mp-weeks", newWeeks);
    storage.set("mp-archive", newArchive);
    storage.set("mp-prefs", newPrefs);
    if (newPrefsHistory !== undefined) storage.set("mp-prefs-history", newPrefsHistory);
  }, []);

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(""), 3000); };

  const weekKey = (tab) => tab === "current" ? getWeekKey(0) : getWeekKey(1);
  const getWD = (tab) => weeks[weekKey(tab)] || { plan: emptyPlan(), locked: false, lockedList: null, meals: [] };

  // FIX 1 + 2: ogni volta che il piano della settimana corrente cambia,
  // aggiorna anche l'archivio se quella settimana è già archiviata
  const updateWeeks = useCallback((newWeeks, currentArchive, currentPrefs, currentPrefsHistory) => {
    const currentKey = getWeekKey(0);
    const currentWD = newWeeks[currentKey];
    let newArchive = currentArchive;

    if (currentWD) {
      const archivedIdx = currentArchive.findIndex(a => a.weekKey === currentKey);
      if (archivedIdx >= 0) {
        // FIX 1: aggiorna la settimana già archiviata con i dati più recenti
        newArchive = currentArchive.map((a, idx) =>
          idx === archivedIdx
            ? { ...a, plan: currentWD.plan, meals: currentWD.meals || [] }
            : a
        );
        setArchive(newArchive);
      }
    }

    setWeeks(newWeeks);
    persist(newWeeks, newArchive, currentPrefs, currentPrefsHistory);
    return newArchive;
  }, [persist]);

  // ── GENERATE ──────────────────────────────────────────────────────────────
  const generateWeek = async (tab) => {
    setLoading(true);
    setApiError("");
    setLoadingMsg("Sto generando 5 ricette uniche per la tua settimana...");

    const likedNames = archive.flatMap(a =>
      (a.likedIds || []).map(id => a.meals?.find(m => m.id === id)?.name).filter(Boolean)
    );
    const likedCtx = likedNames.length > 0
      ? ` L'utente apprezza: ${likedNames.slice(0, 8).join(", ")}. Ispirati a questi gusti.`
      : "";
    const userMsg = `Genera 5 ricette diverse per pranzo da preparare in anticipo.${prefs ? " Preferenze/intolleranze: " + prefs + "." : ""}${likedCtx} Le 5 ricette devono essere completamente diverse tra loro per ingrediente principale.`;

    let rawMeals;
    let usedFallback = false;

    try {
      rawMeals = await callClaudeAPI(userMsg);
    } catch {
      rawMeals = [...FALLBACK_MEALS].sort(() => Math.random() - 0.5);
      usedFallback = true;
    }

    const meals = assignVisuals(rawMeals.slice(0, 5));
    const plan = Object.fromEntries(DAYS.map((d, i) => [d, { ...meals[i], servings: 1 }]));
    const key = weekKey(tab);

    // FIX 3: salva la preferenza nello storico se non vuota e non già presente
    let newPrefsHistory = prefsHistory;
    if (prefs.trim() && !prefsHistory.includes(prefs.trim())) {
      newPrefsHistory = [prefs.trim(), ...prefsHistory].slice(0, 10);
      setPrefsHistory(newPrefsHistory);
    }

    const newWeeks = { ...weeks, [key]: { plan, locked: false, lockedList: null, meals } };
    updateWeeks(newWeeks, archive, prefs, newPrefsHistory);

    setLoading(false);
    setLoadingMsg("");

    if (usedFallback) {
      setApiError("⚠️ API non raggiungibile: ho caricato ricette di esempio. Verifica che il file api/claude.js sia presente e che la variabile ANTHROPIC_KEY sia impostata su Vercel.");
      notify("📋 Piano caricato con ricette di esempio");
    } else {
      notify("✨ Piano generato con 5 ricette uniche!");
    }
  };

  // ── SWAP ──────────────────────────────────────────────────────────────────
  const swapMeal = async (tab, day) => {
    const wd = getWD(tab);
    if (wd.locked) { notify("🔒 Sblocca prima di modificare."); return; }
    const inPlan = DAYS.map(d => wd.plan[d]?.id).filter(Boolean);
    const spare = (wd.meals || []).filter(m => m.id && !inPlan.includes(m.id));

    if (spare.length > 0) {
      const pick = spare[Math.floor(Math.random() * spare.length)];
      const newPlan = { ...wd.plan, [day]: { ...pick, servings: 1 } };
      const key = weekKey(tab);
      const newWeeks = { ...weeks, [key]: { ...wd, plan: newPlan } };
      updateWeeks(newWeeks, archive, prefs, prefsHistory);
      notify("🔄 Sostituita con: " + pick.name);
      return;
    }

    setLoading(true); setLoadingMsg("Cerco una ricetta alternativa...");
    const currentNames = DAYS.map(d => wd.plan[d]?.name).filter(Boolean).join(", ");
    try {
      const parsed = await callClaudeAPI(`Genera UNA ricetta per pranzo, diversa da: ${currentNames}.${prefs ? " Preferenze: " + prefs : ""} Rispondi con array JSON di 1 elemento.`);
      const meal = assignVisuals([parsed[0]])[0];
      const newMeals = [...(wd.meals || []), meal];
      const newPlan = { ...wd.plan, [day]: { ...meal, servings: 1 } };
      const key = weekKey(tab);
      const newWeeks = { ...weeks, [key]: { ...wd, plan: newPlan, meals: newMeals } };
      updateWeeks(newWeeks, archive, prefs, prefsHistory);
      notify("🔄 Sostituita con: " + meal.name);
    } catch {
      const fb = assignVisuals([FALLBACK_MEALS[Math.floor(Math.random() * FALLBACK_MEALS.length)]])[0];
      const newPlan = { ...wd.plan, [day]: { ...fb, servings: 1 } };
      const key = weekKey(tab);
      const newWeeks = { ...weeks, [key]: { ...wd, plan: newPlan } };
      updateWeeks(newWeeks, archive, prefs, prefsHistory);
      notify("🔄 Sostituita con ricetta di esempio.");
    }
    setLoading(false); setLoadingMsg("");
  };

  // ── SERVINGS ──────────────────────────────────────────────────────────────
  const setServings = (tab, day, n) => {
    const wd = getWD(tab);
    if (wd.locked) { notify("🔒 Sblocca prima di modificare."); return; }
    const meal = wd.plan[day]; if (!meal) return;
    const newPlan = { ...wd.plan, [day]: { ...meal, servings: Math.max(1, Math.min(10, n)) } };
    const key = weekKey(tab);
    const newWeeks = { ...weeks, [key]: { ...wd, plan: newPlan } };
    updateWeeks(newWeeks, archive, prefs, prefsHistory);
  };

  // ── LOCK / UNLOCK ─────────────────────────────────────────────────────────
  const lockWeek = (tab) => {
    const wd = getWD(tab);
    const sl = buildShoppingList(wd.plan);
    if (wd.lockedList) {
      const diff = diffLists(wd.lockedList, sl);
      if (diff.added.length || diff.removed.length || diff.changed.length) setDiffModal(diff);
    }
    const key = weekKey(tab);
    const newWeeks = { ...weeks, [key]: { ...wd, locked: true, lockedList: sl } };
    updateWeeks(newWeeks, archive, prefs, prefsHistory);
    notify("🔒 Settimana bloccata!");
  };

  const unlockWeek = (tab) => {
    const wd = getWD(tab);
    const key = weekKey(tab);
    const newWeeks = { ...weeks, [key]: { ...wd, locked: false } };
    updateWeeks(newWeeks, archive, prefs, prefsHistory);
    notify("🔓 Settimana sbloccata.");
  };

  // ── ARCHIVE ───────────────────────────────────────────────────────────────
  const archiveWeek = (tab) => {
    const key = weekKey(tab);
    const wd = getWD(tab);
    if (archive.find(a => a.weekKey === key)) { notify("Già archiviata."); return; }
    const newArchive = [{ weekKey: key, plan: wd.plan, meals: wd.meals || [], likedIds: [] }, ...archive];
    setArchive(newArchive);
    persist(weeks, newArchive, prefs, prefsHistory);
    notify("📦 Settimana archiviata!");
  };

  const toggleLike = (wk, mealId) => {
    const newArchive = archive.map(a => {
      if (a.weekKey !== wk) return a;
      const liked = a.likedIds || [];
      return { ...a, likedIds: liked.includes(mealId) ? liked.filter(id => id !== mealId) : [...liked, mealId] };
    });
    setArchive(newArchive);
    persist(weeks, newArchive, prefs, prefsHistory);
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  // Compute sl here so useEffect can use it (hooks must be before early returns)
  const wd = getWD(activeTab);
  const plan = wd.plan;
  const locked = wd.locked;
  const sl = buildShoppingList(plan);
  const plannedCount = DAYS.filter(d => plan[d]).length;
  const activeSl = sl.filter(i => checkedSl[i.name] !== false);
  const hasData = DAYS.some(d => plan[d]);
  const wLabel = (t) => `${t === "current" ? "Sett. corrente" : "Sett. successiva"} (W${weekKey(t).split("-W")[1]})`;

  // Reset checkedSl to all-checked whenever shopping list content changes
  const slKey = sl.map(i => i.name + i.qty).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setCheckedSl(Object.fromEntries(sl.map(i => [i.name, true]))); }, [slKey]);

  if (!ready) return (
    <div style={{ minHeight:"100vh", background:"#F5F0E8", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Georgia,serif", color:"#6B5D4F", fontSize:16 }}>
      Caricamento...
    </div>
  );

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#F5F0E8", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"Georgia,serif", gap:20 }}>
      <div style={{ fontSize:48, animation:"spin 2s linear infinite" }}>🌿</div>
      <div style={{ fontSize:15, color:"#6B5D4F", textAlign:"center", maxWidth:280 }}>{loadingMsg}</div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#F5F0E8", fontFamily:"Georgia,serif" }}>
      <div style={{ position:"fixed", inset:0, backgroundImage:"radial-gradient(circle at 20% 50%,rgba(212,169,106,.08),transparent 60%),radial-gradient(circle at 80% 20%,rgba(123,175,142,.08),transparent 60%)", pointerEvents:"none" }} />

      {notification && <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", background:"#2C2C2C", color:"#F5F0E8", padding:"10px 22px", borderRadius:40, fontSize:13, zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,.25)", whiteSpace:"nowrap" }}>{notification}</div>}

      {diffModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={() => setDiffModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:20, padding:28, maxWidth:460, width:"100%", boxShadow:"0 16px 48px rgba(0,0,0,.25)" }}>
            <h3 style={{ margin:"0 0 16px", fontSize:16, color:"#2C2C2C" }}>📊 Variazioni lista spesa</h3>
            {diffModal.added.length > 0 && <><p style={{ fontSize:11, letterSpacing:2, color:"#7BAF8E", textTransform:"uppercase", margin:"0 0 6px" }}>Aggiunti</p>{diffModal.added.map(i=><div key={i.name} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #F0EBE0", fontSize:13 }}><span style={{color:"#7BAF8E"}}>+ {i.name}</span><span>{i.qty} {i.unit}</span></div>)}</>}
            {diffModal.removed.length > 0 && <><p style={{ fontSize:11, letterSpacing:2, color:"#C47A7A", textTransform:"uppercase", margin:"12px 0 6px" }}>Rimossi</p>{diffModal.removed.map(i=><div key={i.name} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #F0EBE0", fontSize:13 }}><span style={{color:"#C47A7A"}}>− {i.name}</span><span style={{color:"#B0A090"}}>{i.qty} {i.unit}</span></div>)}</>}
            {diffModal.changed.length > 0 && <><p style={{ fontSize:11, letterSpacing:2, color:"#D4A96A", textTransform:"uppercase", margin:"12px 0 6px" }}>Quantità cambiate</p>{diffModal.changed.map(i=><div key={i.name} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #F0EBE0", fontSize:13 }}><span>{i.name}</span><span style={{color:"#D4A96A"}}>{i.prevQty}→{i.qty} {i.unit}</span></div>)}</>}
            {!diffModal.added.length && !diffModal.removed.length && !diffModal.changed.length && <p style={{color:"#9A8A72",fontSize:13}}>Nessuna variazione.</p>}
            <button onClick={() => setDiffModal(null)} style={{ marginTop:18, padding:"9px 22px", borderRadius:40, border:"none", background:"#2C2C2C", color:"#fff", fontSize:13, cursor:"pointer", fontFamily:"Georgia,serif" }}>Chiudi</button>
          </div>
        </div>
      )}

      <header style={{ padding:"22px 24px 0", display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontSize:10, letterSpacing:4, color:"#9A8A72", textTransform:"uppercase", marginBottom:2 }}>Meal Prep Studio</div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:400, color:"#2C2C2C", lineHeight:1.2 }}>I tuoi pranzi <span style={{ fontStyle:"italic", color:"#7BAF8E" }}>settimanali</span></h1>
        </div>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap", paddingTop:4 }}>
          {["planner","ricette","spesa","archivio"].map(v => (
            <button key={v} onClick={() => { setView(v); setShowRecipe(null); setArchiveDetail(null); }} style={{ padding:"7px 14px", borderRadius:40, border:view===v?"none":"1.5px solid #C8BBA8", background:view===v?"#2C2C2C":"transparent", color:view===v?"#F5F0E8":"#6B5D4F", fontSize:12, cursor:"pointer", fontFamily:"Georgia,serif" }}>
              {v==="planner"?"📅 Planner":v==="ricette"?"📋 Ricette":v==="spesa"?"🛒 Spesa":"📦 Archivio"}
            </button>
          ))}
        </div>
      </header>

      <main style={{ padding:"16px 24px 48px", maxWidth:900, margin:"0 auto" }}>

        {view !== "archivio" && (
          <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
            {["current","next"].map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{ padding:"7px 16px", borderRadius:40, border:activeTab===t?"none":"1.5px solid #C8BBA8", background:activeTab===t?"#4A7A6A":"transparent", color:activeTab===t?"#fff":"#6B5D4F", fontSize:12, cursor:"pointer", fontFamily:"Georgia,serif", display:"flex", alignItems:"center", gap:4 }}>
                {wLabel(t)} {getWD(t).locked ? "🔒" : ""}
              </button>
            ))}
            <div style={{ flex:1 }} />
            {hasData && (locked
              ? <>
                  <button onClick={() => unlockWeek(activeTab)} style={{ padding:"6px 14px", borderRadius:40, border:"1.5px solid #C8BBA8", background:"transparent", color:"#9A8A72", fontSize:12, cursor:"pointer", fontFamily:"Georgia,serif" }}>🔓 Sblocca</button>
                  <button onClick={() => { const diff = diffLists(wd.lockedList || [], sl); setDiffModal(diff); }} style={{ padding:"6px 12px", borderRadius:40, border:"1.5px solid #C8BBA8", background:"transparent", color:"#6B5D4F", fontSize:12, cursor:"pointer" }}>📊 Variazioni</button>
                </>
              : <button onClick={() => lockWeek(activeTab)} style={{ padding:"6px 16px", borderRadius:40, border:"none", background:"#4A7A6A", color:"#fff", fontSize:12, cursor:"pointer", fontFamily:"Georgia,serif" }}>🔒 Blocca</button>
            )}
          </div>
        )}

        {apiError && <div style={{ background:"#FFF8EC", border:"1.5px solid #EDD4A0", borderRadius:12, padding:"10px 16px", fontSize:12, color:"#8A6A2A", marginBottom:14, lineHeight:1.5 }}>{apiError}</div>}

        {/* ── PLANNER ── */}
        {view === "planner" && (
          <div>
            {locked && <div style={{ background:"#E8F5EE", border:"1.5px solid #A8C4B4", borderRadius:10, padding:"9px 14px", fontSize:12, color:"#4A7A6A", marginBottom:12 }}>🔒 Settimana bloccata — ricette fisse. Clicca "Sblocca" per modificare.</div>}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
              <span style={{ color:"#6B5D4F", fontSize:12 }}>{plannedCount}/5 giorni pianificati</span>
              {!locked && (
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => setShowPrefs(!showPrefs)} style={{ padding:"6px 12px", borderRadius:40, border:"1.5px solid #C8BBA8", background:"transparent", color:"#6B5D4F", fontSize:12, cursor:"pointer", fontFamily:"Georgia,serif" }}>⚙️ Preferenze</button>
                  <button onClick={() => generateWeek(activeTab)} style={{ padding:"6px 16px", borderRadius:40, border:"none", background:"#D4A96A", color:"#fff", fontSize:12, cursor:"pointer", fontFamily:"Georgia,serif", boxShadow:"0 2px 8px rgba(212,169,106,.35)" }}>✨ Genera ricette</button>
                </div>
              )}
            </div>

            {/* FIX 3: Preferenze con storico */}
            {showPrefs && !locked && (
              <div style={{ background:"#fff", borderRadius:12, padding:"13px 16px", border:"1.5px solid #EDE6D6", marginBottom:12 }}>
                <label style={{ fontSize:10, letterSpacing:2, color:"#9A8A72", textTransform:"uppercase", display:"block", marginBottom:6 }}>Preferenze / intolleranze</label>
                <div style={{ display:"flex", gap:8, marginBottom: prefsHistory.length > 0 ? 10 : 0 }}>
                  <input value={prefs} onChange={e => { setPrefs(e.target.value); persist(weeks, archive, e.target.value, prefsHistory); }} placeholder="es. vegetariano, senza glutine, no pesce..." style={{ flex:1, padding:"8px 12px", borderRadius:8, border:"1.5px solid #C8BBA8", background:"#FDFAF5", fontSize:13, color:"#2C2C2C", fontFamily:"Georgia,serif", outline:"none" }} />
                  <button onClick={() => { setShowPrefs(false); generateWeek(activeTab); }} style={{ padding:"8px 14px", borderRadius:8, border:"none", background:"#2C2C2C", color:"#fff", fontSize:12, cursor:"pointer", fontFamily:"Georgia,serif" }}>Applica</button>
                </div>
                {prefsHistory.length > 0 && (
                  <div>
                    <div style={{ fontSize:10, letterSpacing:2, color:"#9A8A72", textTransform:"uppercase", marginBottom:6 }}>Usate in precedenza</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {prefsHistory.map((p, i) => (
                        <button key={i} onClick={() => setPrefs(p)} style={{ padding:"4px 10px", borderRadius:20, border:"1.5px solid #C8BBA8", background: prefs === p ? "#F5F0E8" : "transparent", color:"#6B5D4F", fontSize:11, cursor:"pointer", fontFamily:"Georgia,serif" }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!hasData ? (
              <div style={{ background:"#fff", borderRadius:18, padding:"36px 24px", textAlign:"center", border:"1.5px solid #EDE6D6" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🥗</div>
                <p style={{ color:"#6B5D4F", fontSize:14, marginBottom:20 }}>Nessun piano per {wLabel(activeTab).toLowerCase()}.</p>
                <button onClick={() => generateWeek(activeTab)} style={{ padding:"11px 28px", borderRadius:40, border:"none", background:"#2C2C2C", color:"#fff", fontSize:14, cursor:"pointer", fontFamily:"Georgia,serif" }}>✨ Genera il piano</button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                {DAYS.map(day => {
                  const meal = plan[day];
                  return (
                    <div key={day} style={{ display:"flex", alignItems:"center", gap:12, background:"#fff", borderRadius:14, padding:"12px 14px", boxShadow:"0 2px 10px rgba(0,0,0,.05)", border:"1.5px solid #EDE6D6" }}>
                      <div style={{ width:68, flexShrink:0 }}>
                        <div style={{ fontSize:9, letterSpacing:2, color:"#9A8A72", textTransform:"uppercase" }}>{day.slice(0,3)}</div>
                        <div style={{ fontSize:15, fontWeight:600, color:"#2C2C2C" }}>{day.slice(3)||day}</div>
                      </div>
                      {meal ? (
                        <div style={{ flex:1, display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:38, height:38, borderRadius:9, background:meal.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{meal.emoji}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:"#2C2C2C", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:2 }}>{meal.name}</div>
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                              <span style={{ fontSize:10, color:"#9A8A72" }}>⏱{meal.prep}min</span>
                              <span style={{ fontSize:10, color:"#9A8A72" }}>🔥{meal.kcal*(meal.servings||1)}kcal</span>
                              {meal.tags?.slice(0,1).map(t=><span key={t} style={{ fontSize:9, padding:"1px 6px", borderRadius:20, background:meal.color+"22", color:meal.color }}>{t}</span>)}
                            </div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:3, background:"#F5F0E8", borderRadius:20, padding:"2px 6px", flexShrink:0 }}>
                            <button onClick={() => setServings(activeTab, day, (meal.servings||1)-1)} disabled={locked} style={{ width:20, height:20, borderRadius:"50%", border:"none", background:locked?"transparent":"#E8E0D0", color:"#6B5D4F", cursor:locked?"default":"pointer", fontSize:13, padding:0, lineHeight:1 }}>−</button>
                            <span style={{ fontSize:11, color:"#2C2C2C", minWidth:14, textAlign:"center" }}>{meal.servings||1}</span>
                            <button onClick={() => setServings(activeTab, day, (meal.servings||1)+1)} disabled={locked} style={{ width:20, height:20, borderRadius:"50%", border:"none", background:locked?"transparent":"#E8E0D0", color:"#6B5D4F", cursor:locked?"default":"pointer", fontSize:13, padding:0, lineHeight:1 }}>+</button>
                          </div>
                          <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                            <button onClick={() => { setShowRecipe(meal); setView("ricette"); }} style={{ padding:"4px 9px", borderRadius:20, border:"1.5px solid #C8BBA8", background:"transparent", color:"#6B5D4F", fontSize:11, cursor:"pointer" }}>Ricetta</button>
                            {!locked && <button onClick={() => swapMeal(activeTab, day)} style={{ padding:"4px 8px", borderRadius:20, border:"1.5px solid #A8C4B8", background:"transparent", color:"#5A8A70", fontSize:12, cursor:"pointer" }}>🔄</button>}
                            {!locked && <button onClick={() => { const np={...plan,[day]:null}; const key=weekKey(activeTab); const nw={...weeks,[key]:{...wd,plan:np}}; updateWeeks(nw,archive,prefs,prefsHistory); }} style={{ padding:"4px 8px", borderRadius:20, border:"1.5px solid #F0C4C4", background:"transparent", color:"#C47A7A", fontSize:11, cursor:"pointer" }}>✕</button>}
                          </div>
                        </div>
                      ) : (
                        <div style={{ flex:1, display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ flex:1, height:38, borderRadius:9, border:"1.5px dashed #C8BBA8", display:"flex", alignItems:"center", paddingLeft:12, color:"#B0A090", fontSize:12 }}>Nessun pasto assegnato</div>
                          {!locked && (
                            <button onClick={async () => {
                              const currentNames = DAYS.map(d => plan[d]?.name).filter(Boolean).join(", ");
                              setLoading(true); setLoadingMsg("Genero una ricetta per " + day + "...");
                              try {
                                const parsed = await callClaudeAPI("Genera UNA ricetta per pranzo da preparare in anticipo, diversa da: " + (currentNames || "nessuna") + "." + (prefs ? " Preferenze: " + prefs : "") + " Rispondi con array JSON di 1 elemento.");
                                const meal = assignVisuals([parsed[0]])[0];
                                const newMeals = [...(wd.meals || []), meal];
                                const newPlan = { ...plan, [day]: { ...meal, servings: 1 } };
                                const key = weekKey(activeTab);
                                const nw = { ...weeks, [key]: { ...wd, plan: newPlan, meals: newMeals } };
                                updateWeeks(nw, archive, prefs, prefsHistory);
                                notify("✨ Ricetta generata per " + day + "!");
                              } catch {
                                const fb = assignVisuals([FALLBACK_MEALS[Math.floor(Math.random() * FALLBACK_MEALS.length)]])[0];
                                const newPlan = { ...plan, [day]: { ...fb, servings: 1 } };
                                const key = weekKey(activeTab);
                                const nw = { ...weeks, [key]: { ...wd, plan: newPlan } };
                                updateWeeks(nw, archive, prefs, prefsHistory);
                                notify("📋 Ricetta di esempio inserita per " + day);
                              }
                              setLoading(false); setLoadingMsg("");
                            }} style={{ padding:"5px 12px", borderRadius:20, border:"none", background:"#D4A96A", color:"#fff", fontSize:11, cursor:"pointer", fontFamily:"Georgia,serif", whiteSpace:"nowrap", boxShadow:"0 2px 6px rgba(212,169,106,.35)" }}>
                              ✨ Genera
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── RICETTE ── */}
        {view === "ricette" && (
          <div>
            {showRecipe ? (
              <div>
                <button onClick={() => setShowRecipe(null)} style={{ marginBottom:14, padding:"6px 14px", borderRadius:20, border:"1.5px solid #C8BBA8", background:"transparent", color:"#6B5D4F", fontSize:12, cursor:"pointer" }}>← Tutte le ricette</button>
                <div style={{ background:"#fff", borderRadius:18, overflow:"hidden", border:"1.5px solid #EDE6D6", boxShadow:"0 4px 20px rgba(0,0,0,.06)" }}>
                  <div style={{ padding:"24px 24px 16px", background:"linear-gradient(135deg,"+showRecipe.color+"18,transparent)", borderBottom:"1.5px solid #EDE6D6" }}>
                    <div style={{ fontSize:32, marginBottom:8 }}>{showRecipe.emoji}</div>
                    <h2 style={{ margin:"0 0 6px", fontSize:19, fontWeight:400, color:"#2C2C2C" }}>{showRecipe.name}</h2>
                    <div style={{ display:"flex", gap:14 }}><span style={{ fontSize:12, color:"#6B5D4F" }}>⏱ {showRecipe.prep} min</span><span style={{ fontSize:12, color:"#6B5D4F" }}>🔥 {showRecipe.kcal} kcal/porzione</span></div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
                    <div style={{ padding:"18px 20px", borderRight:"1.5px solid #EDE6D6" }}>
                      <h3 style={{ fontSize:10, letterSpacing:3, color:"#9A8A72", textTransform:"uppercase", marginBottom:10, marginTop:0 }}>Ingredienti (1 porzione)</h3>
                      {(showRecipe.ingredients||[]).map((ing,i)=><div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #F0EBE0", fontSize:12, color:"#2C2C2C" }}><span>{ing.name}</span><span style={{color:"#9A8A72"}}>{ing.qty} {ing.unit}</span></div>)}
                    </div>
                    <div style={{ padding:"18px 20px" }}>
                      <h3 style={{ fontSize:10, letterSpacing:3, color:"#9A8A72", textTransform:"uppercase", marginBottom:10, marginTop:0 }}>Procedimento</h3>
                      {(showRecipe.steps||[]).map((step,i)=><div key={i} style={{ display:"flex", gap:10, marginBottom:10 }}><div style={{ width:19, height:19, borderRadius:"50%", flexShrink:0, background:showRecipe.color+"33", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:showRecipe.color }}>{i+1}</div><p style={{ margin:0, fontSize:12, color:"#4A4035", lineHeight:1.6 }}>{step}</p></div>)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color:"#6B5D4F", fontSize:12, marginTop:0 }}>{(wd.meals||[]).length} ricette · {wLabel(activeTab)}</p>
                {!(wd.meals||[]).length ? <div style={{ background:"#fff", borderRadius:14, padding:"28px", textAlign:"center", border:"1.5px solid #EDE6D6", color:"#9A8A72" }}>Genera prima un piano nel Planner.</div> : (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
                    {(wd.meals||[]).map(meal=>(
                      <div key={meal.id} onClick={()=>setShowRecipe(meal)} style={{ background:"#fff", borderRadius:14, overflow:"hidden", cursor:"pointer", border:"1.5px solid #EDE6D6", transition:"all .18s", boxShadow:"0 2px 8px rgba(0,0,0,.04)" }}
                        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,.1)"}}
                        onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,.04)"}}>
                        <div style={{ padding:"16px 14px 10px", background:"linear-gradient(135deg,"+meal.color+"15,transparent)" }}>
                          <div style={{ fontSize:24, marginBottom:5 }}>{meal.emoji}</div>
                          <h3 style={{ margin:"0 0 4px", fontSize:12, fontWeight:600, color:"#2C2C2C" }}>{meal.name}</h3>
                          <div style={{ display:"flex", gap:8 }}><span style={{ fontSize:10, color:"#9A8A72" }}>⏱{meal.prep}min</span><span style={{ fontSize:10, color:"#9A8A72" }}>🔥{meal.kcal}kcal</span></div>
                        </div>
                        <div style={{ padding:"7px 14px 10px", display:"flex", gap:4, flexWrap:"wrap" }}>
                          {(meal.tags||[]).map(t=><span key={t} style={{ fontSize:9, padding:"1px 7px", borderRadius:20, background:meal.color+"18", color:meal.color }}>{t}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SPESA ── */}
        {view === "spesa" && (
          <div>
            {locked && <div style={{ background:"#E8F5EE", border:"1.5px solid #A8C4B4", borderRadius:10, padding:"9px 14px", fontSize:12, color:"#4A7A6A", marginBottom:12 }}>🔒 Lista bloccata — spunte e selezione fisse.</div>}
            {!plannedCount ? (
              <div style={{ background:"#fff", borderRadius:18, padding:"36px", textAlign:"center", border:"1.5px solid #EDE6D6" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🛒</div>
                <p style={{ color:"#6B5D4F" }}>Pianifica i pasti nel Planner.</p>
                <button onClick={()=>setView("planner")} style={{ padding:"9px 20px", borderRadius:40, border:"none", background:"#2C2C2C", color:"#fff", fontSize:13, cursor:"pointer", fontFamily:"Georgia,serif" }}>Vai al Planner</button>
              </div>
            ) : (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
                  <span style={{ color:"#6B5D4F", fontSize:12 }}>
                    <strong>{activeSl.length}/{sl.length} prodotti</strong> selezionati
                    {!locked && <span style={{color:"#9A8A72"}}> · clicca per deselezionare</span>}
                  </span>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {!locked && (
                      <>
                        <button onClick={() => setCheckedSl(Object.fromEntries(sl.map(i=>[i.name,true])))} style={{ padding:"5px 10px", borderRadius:20, border:"1.5px solid #C8BBA8", background:"transparent", color:"#6B5D4F", fontSize:11, cursor:"pointer" }}>✓ Tutti</button>
                        <button onClick={() => setCheckedSl(Object.fromEntries(sl.map(i=>[i.name,false])))} style={{ padding:"5px 10px", borderRadius:20, border:"1.5px solid #C8BBA8", background:"transparent", color:"#6B5D4F", fontSize:11, cursor:"pointer" }}>✗ Nessuno</button>
                      </>
                    )}
                    <button onClick={() => {
                      const t = "🛒 Lista spesa — "+wLabel(activeTab)+"\n\n"+activeSl.map(i=>"• "+i.name+" — "+i.qty+" "+i.unit).join("\n");
                      navigator.clipboard.writeText(t).then(()=>notify("📋 Copiata ("+activeSl.length+" prodotti)!"));
                    }} style={{ padding:"6px 12px", borderRadius:20, border:"1.5px solid #C8BBA8", background:"transparent", color:"#6B5D4F", fontSize:12, cursor:"pointer" }}>📋 Copia lista</button>
                    <button onClick={() => {
                      const encoded = encodeURIComponent(JSON.stringify(activeSl));
                      const label = encodeURIComponent(wLabel(activeTab));
                      const apiUrl = window.location.origin+"/api/shopping-list?items="+encoded+"&weekLabel="+label;
                      window.open(apiUrl, "_blank");
                      notify("📤 Lista pronta per Chrome ("+activeSl.length+" prodotti)!");
                    }} style={{ padding:"6px 12px", borderRadius:20, border:"1.5px solid #A8C4B8", background:"transparent", color:"#4A7A6A", fontSize:12, cursor:"pointer" }}>📤 Invia a Chrome</button>
                  </div>
                </div>

                {(() => {
                  // Categorize items by keyword
                  const CATS = [
                    { label:"🥩 Carne e Pesce",    color:"#C4855A", keys:["pollo","carne","tonno","salmone","merluzzo","tacchino","manzo","maiale","gamberett","pesce","prosciutto","pancetta","speck"] },
                    { label:"🥦 Verdure",           color:"#7BAF8E", keys:["zucchine","pomodor","insalata","spinaci","rucola","carote","carota","peperone","cetriolo","cipolla","aglio","broccoli","funghi","melanzane","sedano","finocchio","verdur","lattuga"] },
                    { label:"🌾 Cereali e Legumi",  color:"#D4A96A", keys:["farro","riso","quinoa","pasta","lenticchie","ceci","fagioli","avena","orzo","farina","pane","tortilla","edamame","mais","couscous"] },
                    { label:"🧀 Latticini e Uova",  color:"#8FA656", keys:["feta","parmigiano","mozzarella","yogurt","latte","burro","uova","uovo","formaggio","ricotta","panna"] },
                    { label:"🫙 Condimenti e Altro",color:"#9A8A72", keys:[] },
                  ];
                  function getCategory(name) {
                    const n = name.toLowerCase();
                    for (const cat of CATS.slice(0,-1)) {
                      if (cat.keys.some(k => n.includes(k))) return cat.label;
                    }
                    return CATS[CATS.length-1].label;
                  }
                  // Group items by category
                  const grouped = {};
                  sl.forEach(item => {
                    const cat = getCategory(item.name);
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(item);
                  });
                  const catOrder = CATS.map(c => c.label).filter(l => grouped[l]);
                  return catOrder.map(catLabel => {
                    const catColor = CATS.find(c => c.label === catLabel)?.color || "#9A8A72";
                    const items = grouped[catLabel];
                    return (
                      <div key={catLabel} style={{ marginBottom:10 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:catColor, letterSpacing:1, textTransform:"uppercase", padding:"8px 16px 6px", background:"#fff", borderRadius:"12px 12px 0 0", borderBottom:"1.5px solid #EDE6D6", border:"1.5px solid #EDE6D6" }}>
                          {catLabel} <span style={{color:"#B0A090",fontWeight:400}}>({items.filter(i=>checkedSl[i.name]!==false).length}/{items.length})</span>
                        </div>
                        <div style={{ background:"#fff", borderRadius:"0 0 12px 12px", border:"1.5px solid #EDE6D6", borderTop:"none", overflow:"hidden" }}>
                          {items.map((item, i) => {
                            const checked = checkedSl[item.name] !== false;
                            return (
                              <div key={item.name}
                                onClick={() => { if (!locked) setCheckedSl(prev => ({...prev, [item.name]: !checked})); }}
                                style={{ display:"flex", alignItems:"center", padding:"10px 14px", borderBottom:i<items.length-1?"1px solid #F0EBE0":"none", fontSize:13, gap:10, cursor:locked?"default":"pointer", background:checked?"#fff":"#F8F6F2", transition:"background .15s" }}>
                                <div style={{ width:19, height:19, borderRadius:5, flexShrink:0, border:checked?"none":"1.5px solid #C8BBA8", background:checked?"#7BAF8E":"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}>
                                  {checked && <svg width="10" height="8" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                                <span style={{ flex:1, color:checked?"#2C2C2C":"#B0A090", textDecoration:checked?"none":"line-through", transition:"all .15s" }}>{item.name}</span>
                                <span style={{ color:"#9A8A72", fontStyle:"italic", flexShrink:0, fontSize:12 }}>{item.qty} {item.unit}</span>
                                {checked && (
                                  <a href={"https://www.amazon.it/s?k="+encodeURIComponent(item.name)+"&i=amazonfresh"} target="_blank" rel="noreferrer"
                                    onClick={e=>e.stopPropagation()}
                                    title={"Cerca su Amazon Fresh: "+item.name}
                                    style={{ flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", width:24, height:24, borderRadius:6, background:"#FFF3E0", border:"1.5px solid #FFD180", textDecoration:"none", fontSize:12 }}>
                                    🛒
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}


                <div style={{ marginTop:12, padding:"11px 14px", background:"#EDF5F0", borderRadius:10, fontSize:12, color:"#5A8A6E" }}>💡 <strong>Tip:</strong> Cuoci cereali e legumi la domenica sera — si conservano 4-5 giorni in frigo.</div>
              </div>
            )}
          </div>
        )}

        {/* ── ARCHIVIO ── */}
        {view === "archivio" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
              <span style={{ color:"#6B5D4F", fontSize:12 }}>{archive.length} settimane · ❤️ per insegnare i tuoi gusti all'AI</span>
              <button onClick={() => archiveWeek("current")} style={{ padding:"6px 13px", borderRadius:20, border:"1.5px solid #C8BBA8", background:"transparent", color:"#6B5D4F", fontSize:12, cursor:"pointer" }}>+ Archivia sett. corrente</button>
            </div>

            {!archive.length ? (
              <div style={{ background:"#fff", borderRadius:14, padding:"28px", textAlign:"center", border:"1.5px solid #EDE6D6", color:"#9A8A72", fontSize:13 }}>Nessuna settimana archiviata ancora.</div>
            ) : archiveDetail ? (() => {
              const aw = archive.find(a => a.weekKey === archiveDetail);
              if (!aw) return null;
              return (
                <div>
                  <button onClick={()=>setArchiveDetail(null)} style={{ marginBottom:14, padding:"6px 14px", borderRadius:20, border:"1.5px solid #C8BBA8", background:"transparent", color:"#6B5D4F", fontSize:12, cursor:"pointer" }}>← Archivio</button>
                  <div style={{ fontSize:12, color:"#9A8A72", marginBottom:12 }}>Settimana {aw.weekKey} · ❤️ clicca il cuore sulle ricette preferite</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {DAYS.map(day => {
                      const meal = aw.plan[day]; if (!meal) return null;
                      const liked = (aw.likedIds||[]).includes(meal.id);
                      return (
                        <div key={day} style={{ display:"flex", alignItems:"center", gap:12, background:"#fff", borderRadius:12, padding:"11px 14px", border:"1.5px solid #EDE6D6" }}>
                          <div style={{ width:32, height:32, borderRadius:8, background:meal.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{meal.emoji}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:"#2C2C2C", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{meal.name}</div>
                            <div style={{ fontSize:10, color:"#9A8A72" }}>{day} · {meal.kcal} kcal · {meal.prep}min</div>
                          </div>
                          <button onClick={() => toggleLike(aw.weekKey, meal.id)} style={{ fontSize:19, background:"transparent", border:"none", cursor:"pointer", padding:"3px 6px", borderRadius:8, transition:"transform .15s" }} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.25)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                            {liked ? "❤️" : "🤍"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {(aw.likedIds||[]).length > 0 && <div style={{ marginTop:14, padding:"11px 14px", background:"#FFF8EC", borderRadius:10, border:"1.5px solid #EDE6D6", fontSize:12, color:"#6B5D4F" }}>❤️ <strong>{aw.likedIds.length}</strong> ricette preferite — l'AI ne terrà conto per i piani futuri.</div>}
                </div>
              );
            })() : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:12 }}>
                {archive.map(aw => (
                  <div key={aw.weekKey} onClick={()=>setArchiveDetail(aw.weekKey)} style={{ background:"#fff", borderRadius:14, padding:"16px", border:"1.5px solid #EDE6D6", cursor:"pointer", transition:"all .18s", boxShadow:"0 2px 8px rgba(0,0,0,.04)" }}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,.1)"}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,.04)"}}>
                    <div style={{ fontSize:10, letterSpacing:2, color:"#9A8A72", textTransform:"uppercase", marginBottom:4 }}>{aw.weekKey}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#2C2C2C", marginBottom:6 }}>{DAYS.filter(d=>aw.plan[d]).length} pasti pianificati</div>
                    <div style={{ display:"flex", gap:3, marginBottom:8 }}>{DAYS.map(d=>aw.plan[d]?<span key={d} style={{fontSize:15}}>{aw.plan[d].emoji}</span>:null)}</div>
                    <div style={{ fontSize:11, color:(aw.likedIds||[]).length>0?"#C4855A":"#B0A090" }}>{(aw.likedIds||[]).length>0?`❤️ ${aw.likedIds.length} preferite`:"Nessuna preferenza"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
      <style>{"button:focus{outline:none}*{box-sizing:border-box}"}</style>
    </div>
  );
}
