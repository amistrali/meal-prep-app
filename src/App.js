import { useState, useCallback, useEffect } from "react";

const COLORS = ["#D4A96A","#7BAF8E","#5B8DB8","#C4855A","#8FA656","#A67BAF","#AF7B8A","#6AA8AF"];
const EMOJIS = ["🥗","🍝","🌾","🐟","🌯","🥙","🍱","🥘","🫕","🍛","🥦","🫙"];
const DAYS = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì"];

const FALLBACK_MEALS = [
  // ... mantiene i tuoi fallback attuali ...
];

// Utility functions
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
  const pm = Object.fromEntries(prev.map(i => [i.name, i]));
  const cm = Object.fromEntries(curr.map(i => [i.name, i]));
  return {
    added: curr.filter(i => !pm[i.name]),
    removed: prev.filter(i => !cm[i.name]),
    changed: curr.filter(i => pm[i.name] && pm[i.name].qty !== i.qty).map(i => ({ ...i, prevQty: pm[i.name].qty }))
  };
}

const emptyPlan = () => Object.fromEntries(DAYS.map(d => [d, null]));

// ── SERVERLESS API CALL ─────────────────────────────────────────────────
async function callClaudeAPI(userMsg) {
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: userMsg }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error("Array vuoto");
  return data;
}

// ── STORAGE ────────────────────────────────────────────────────────────────
async function storageGet(key) {
  try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; } catch { return null; }
}
async function storageSet(key, val) {
  try { await window.storage.set(key, JSON.stringify(val)); } catch {}
}

// ── APP ───────────────────────────────────────────────────────────────────
export default function App() {
  const [weeks, setWeeks] = useState({});
  const [archive, setArchive] = useState([]);
  const [prefs, setPrefs] = useState("");
  const [activeTab, setActiveTab] = useState("current");
  const [view, setView] = useState("planner");
  const [notification, setNotification] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [diffModal, setDiffModal] = useState(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const [ready, setReady] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    Promise.all([storageGet("mp-weeks"), storageGet("mp-archive"), storageGet("mp-prefs")]).then(([w, a, p]) => {
      if (w) setWeeks(w);
      if (a) setArchive(a);
      if (p) setPrefs(p);
      setReady(true);
    });
  }, []);

  const persist = useCallback((newWeeks, newArchive, newPrefs) => {
    storageSet("mp-weeks", newWeeks);
    storageSet("mp-archive", newArchive);
    storageSet("mp-prefs", newPrefs);
  }, []);

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(""), 3000); };
  const weekKey = (tab) => tab === "current" ? getWeekKey(0) : getWeekKey(1);
  const getWD = (tab) => weeks[weekKey(tab)] || { plan: emptyPlan(), locked: false, lockedList: null, meals: [] };

  const generateWeek = async (tab) => {
    setLoading(true); setApiError(""); setLoadingMsg("Sto generando 5 ricette...");
    const likedNames = archive.flatMap(a => (a.likedIds || []).map(id => a.meals?.find(m => m.id === id)?.name).filter(Boolean));
    const likedCtx = likedNames.length ? ` L'utente apprezza: ${likedNames.slice(0, 8).join(", ")}.` : "";
    const userMsg = `Genera 5 ricette diverse per pranzo da preparare in anticipo.${prefs ? " Preferenze/intolleranze: " + prefs + "." : ""}${likedCtx}`;

    let rawMeals; let usedFallback = false;
    try {
      rawMeals = await callClaudeAPI(userMsg);
    } catch (err) {
      rawMeals = [...FALLBACK_MEALS].sort(() => Math.random() - 0.5);
      usedFallback = true;
    }

    const meals = assignVisuals(rawMeals.slice(0, 5));
    const plan = Object.fromEntries(DAYS.map((d, i) => [d, { ...meals[i], servings: 1 }]));
    const key = weekKey(tab);
    const newWeeks = { ...weeks, [key]: { plan, locked: false, lockedList: null, meals } };
    setWeeks(newWeeks); persist(newWeeks, archive, prefs);
    setLoading(false); setLoadingMsg("");

    if (usedFallback) {
      setApiError("⚠️ API non raggiungibile: caricate ricette di esempio.");
      notify("📋 Piano caricato con ricette di esempio");
    } else {
      notify("✨ Piano generato con 5 ricette uniche!");
    }
  };

  // ... resto dei metodi swapMeal, setServings, lockWeek, unlockWeek, archiveWeek, toggleLike rimane invariato ...

  if (!ready) return <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>Caricamento...</div>;
  if (loading) return <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" }}>🌿<div>{loadingMsg}</div></div>;

  const wd = getWD(activeTab);
  const plan = wd.plan;
  const locked = wd.locked;
  const hasData = DAYS.some(d => plan[d]);

  return (
    <div style={{ minHeight:"100vh", fontFamily:"Georgia,serif", background:"#F5F0E8" }}>
      {/* Toast, Header, Planner UI rimangono invariati */}
    </div>
  );
}