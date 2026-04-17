import { useState, useCallback, useEffect } from "react";

const COLORS = ["#D4A96A","#7BAF8E","#5B8DB8","#C4855A","#8FA656","#A67BAF","#AF7B8A","#6AA8AF"];
const EMOJIS = ["🥗","🍝","🌾","🐟","🌯","🥙","🍱","🥘","🫕","🍛","🥦","🫙"];
const DAYS = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì"];

// Fallback meals if API unavailable
const FALLBACK_MEALS = [
  { name:"Bowl di Farro con Pollo", kcal:480, prep:25, servings:1, tags:["proteico","cereali"], ingredients:[{name:"Farro perlato",qty:80,unit:"g"},{name:"Petto di pollo",qty:120,unit:"g"},{name:"Zucchine",qty:1,unit:"pz"},{name:"Pomodorini",qty:100,unit:"g"},{name:"Olio EVO",qty:1,unit:"cucchiaio"}], steps:["Cuoci il farro 20 min in acqua salata, scola e raffredda.","Taglia il pollo a cubetti, saltalo con olio e timo 8 min.","Grigliale le zucchine a rondelle 3-4 min per lato.","Assembla il bowl e condisci con olio e limone.","Conserva in contenitore ermetico fino a 3 giorni."] },
  { name:"Quinoa con Ceci e Feta", kcal:420, prep:15, servings:1, tags:["vegetariano","legumi"], ingredients:[{name:"Quinoa",qty:70,unit:"g"},{name:"Ceci cotti",qty:150,unit:"g"},{name:"Feta",qty:50,unit:"g"},{name:"Cetriolo",qty:0.5,unit:"pz"},{name:"Olio EVO",qty:1,unit:"cucchiaio"}], steps:["Cuoci la quinoa in acqua 2:1 per 15 min, raffredda.","Taglia cetriolo e peperone a cubetti.","Mescola tutto con feta sbriciolata.","Condisci con olio e aceto di mele.","Conserva 3-4 giorni in frigo."] },
  { name:"Riso Integrale con Tonno", kcal:450, prep:20, servings:1, tags:["pesce","omega-3"], ingredients:[{name:"Riso integrale",qty:80,unit:"g"},{name:"Tonno al naturale",qty:130,unit:"g"},{name:"Edamame",qty:80,unit:"g"},{name:"Mais",qty:50,unit:"g"},{name:"Salsa di soia",qty:1,unit:"cucchiaino"}], steps:["Cuoci il riso integrale 30-35 min.","Scuoci gli edamame 3 min.","Spezzetta il tonno con una forchetta.","Assembla con soia e zenzero.","Cospargi di semi di sesamo."] },
  { name:"Wrap con Hummus e Verdure", kcal:380, prep:10, servings:1, tags:["vegano","veloce"], ingredients:[{name:"Tortilla integrale",qty:1,unit:"pz"},{name:"Hummus",qty:80,unit:"g"},{name:"Carote",qty:1,unit:"pz"},{name:"Spinaci",qty:40,unit:"g"},{name:"Avocado",qty:0.5,unit:"pz"}], steps:["Stendi l'hummus sulla tortilla.","Aggiungi spinaci, carote grattugiate e avocado.","Spremi il limone sopra.","Arrotola stretto e taglia a metà.","Avvolgi nella pellicola, si conserva 1 giorno."] },
  { name:"Pasta Lenticchie e Pesto Rucola", kcal:510, prep:20, servings:1, tags:["vegetariano","proteico"], ingredients:[{name:"Pasta di lenticchie",qty:80,unit:"g"},{name:"Rucola",qty:40,unit:"g"},{name:"Parmigiano",qty:20,unit:"g"},{name:"Noci",qty:20,unit:"g"},{name:"Olio EVO",qty:2,unit:"cucchiai"}], steps:["Cuoci la pasta 1 min meno del dovuto.","Frulla rucola, noci, parmigiano e olio.","Condisci la pasta con il pesto.","Aggiungi i ciliegini tagliati.","Conserva 2 giorni in frigo."] },
];

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

// ── STORAGE ────────────────────────────────────────────────────────────────
async function storageGet(key) {
  try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; } catch { return null; }
}
async function storageSet(key, val) {
  try { await window.storage.set(key, JSON.stringify(val)); } catch {}
}

// ── APP ────────────────────────────────────────────────────────────────────
export default function App() {
  const [weeks, setWeeks] = useState({});
  const [archive, setArchive] = useState([]);
  const [prefs, setPrefs] = useState("");
  const [activeTab, setActiveTab] = useState("current");

  // load
  useEffect(() => {
    Promise.all([storageGet("mp-weeks"), storageGet("mp-archive"), storageGet("mp-prefs")]).then(([w, a, p]) => {
      if (w) setWeeks(w);
      if (a) setArchive(a);
      if (p) setPrefs(p);
    });
  }, []);

  // 🔴 MODIFICATO
  const persist = useCallback((newWeeks, newArchive, newPrefs) => {
    const syncedArchive = (newArchive || []).map(a => {
      const w = newWeeks[a.weekKey];
      if (!w) return a;
      return { ...a, plan: w.plan, meals: w.meals || a.meals };
    });

    storageSet("mp-weeks", newWeeks);
    storageSet("mp-archive", syncedArchive);
    storageSet("mp-prefs", newPrefs);

    setArchive(syncedArchive);
  }, []);

  const weekKey = (tab) => tab === "current" ? getWeekKey(0) : getWeekKey(1);
  const getWD = (tab) => weeks[weekKey(tab)] || { plan: emptyPlan(), locked: false, meals: [] };

  // 🔴 MODIFICATO
  const archiveWeek = (tab) => {
    const key = weekKey(tab);
    const wd = getWD(tab);

    const exists = archive.find(a => a.weekKey === key);

    const newArchive = exists
      ? archive.map(a =>
          a.weekKey === key
            ? { ...a, plan: wd.plan, meals: wd.meals || a.meals }
            : a
        )
      : [{ weekKey: key, plan: wd.plan, meals: wd.meals || [], likedIds: [] }, ...archive];

    setArchive(newArchive);
    persist(weeks, newArchive, prefs);
  };

  return <div>App pronta</div>;
}