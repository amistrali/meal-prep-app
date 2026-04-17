import React, { useState, useCallback, useEffect } from "react";

const COLORS = ["#D4A96A","#7BAF8E","#5B8DB8","#C4855A","#8FA656","#A67BAF","#AF7B8A","#6AA8AF"];
const EMOJIS = ["🥗","🍝","🌾","🐟","🌯","🥙","🍱","🥘","🫕","🍛","🥦","🫙"];
const DAYS = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì"];

const FALLBACK_MEALS = [
  { name:"Bowl di Farro con Pollo", kcal:480, prep:25, servings:1, tags:["proteico"], ingredients:[{name:"Farro",qty:80,unit:"g"}], steps:["Cuoci","Assembla"] },
  { name:"Quinoa e Ceci", kcal:420, prep:15, servings:1, tags:["veg"], ingredients:[{name:"Quinoa",qty:70,unit:"g"}], steps:["Cuoci","Mescola"] },
  { name:"Riso Tonno", kcal:450, prep:20, servings:1, tags:["pesce"], ingredients:[{name:"Riso",qty:80,unit:"g"}], steps:["Cuoci","Unisci"] },
  { name:"Wrap Hummus", kcal:380, prep:10, servings:1, tags:["vegano"], ingredients:[{name:"Tortilla",qty:1,unit:"pz"}], steps:["Farcisci"] },
  { name:"Pasta Lenticchie", kcal:510, prep:20, servings:1, tags:["veg"], ingredients:[{name:"Pasta",qty:80,unit:"g"}], steps:["Cuoci"] }
];

function getWeekKey(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const wn = Math.ceil(((d - jan4) / 86400000 + jan4.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(wn).padStart(2,"0")}`;
}

function assignVisuals(meals) {
  return meals.map((m, i) => ({
    ...m,
    id: m.id || Date.now() + i,
    color: COLORS[i % COLORS.length],
    emoji: EMOJIS[i % EMOJIS.length]
  }));
}

function emptyPlan() {
  return Object.fromEntries(DAYS.map(d => [d, null]));
}

function buildShoppingList(plan) {
  const totals = {};
  DAYS.forEach(day => {
    const m = plan?.[day];
    if (!m) return;
    (m.ingredients || []).forEach(i => {
      if (!totals[i.name]) totals[i.name] = { name: i.name, qty: 0, unit: i.unit };
      totals[i.name].qty += i.qty * (m.servings || 1);
    });
  });
  return Object.values(totals);
}

async function storageGet(key) {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
}

async function storageSet(key, val) {
  try {
    await window.storage.set(key, JSON.stringify(val));
  } catch {}
}

export default function App() {

  const [weeks, setWeeks] = useState({});
  const [archive, setArchive] = useState([]);
  const [prefs, setPrefs] = useState("");

  const [activeTab, setActiveTab] = useState("current");
  const [view, setView] = useState("planner");

  const [showRecipe, setShowRecipe] = useState(null);
  const [notification, setNotification] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      storageGet("mp-weeks"),
      storageGet("mp-archive"),
      storageGet("mp-prefs")
    ]).then(([w,a,p]) => {
      if (w) setWeeks(w);
      if (a) setArchive(a);
      if (p) setPrefs(p);
      setReady(true);
    });
  }, []);

  const persist = useCallback((w,a,p) => {
    storageSet("mp-weeks", w);
    storageSet("mp-archive", a);
    storageSet("mp-prefs", p);
  }, []);

  const notify = (m) => {
    setNotification(m);
    setTimeout(() => setNotification(""), 2000);
  };

  const weekKey = (t) => t === "current" ? getWeekKey(0) : getWeekKey(1);

  const getWD = () => {
    const k = weekKey(activeTab);
    return weeks[k] || { plan: emptyPlan(), meals: [] };
  };

  const generateWeek = () => {
    const key = weekKey(activeTab);
    const meals = assignVisuals([...FALLBACK_MEALS]);
    const plan = Object.fromEntries(DAYS.map((d,i)=>[d, meals[i]]));

    const newWeeks = {
      ...weeks,
      [key]: { plan, meals }
    };

    setWeeks(newWeeks);
    persist(newWeeks, archive, prefs);
    notify("Generato");
  };

  const wd = getWD();

  if (!ready) return <div>Loading...</div>;

  return (
    <div style={{ fontFamily:"Georgia" }}>

      {notification && <div>{notification}</div>}

      {view === "planner" && (
        <div>
          <button onClick={generateWeek}>Genera</button>

          {DAYS.map(d => (
            <div key={d}>
              <strong>{d}</strong> {wd.plan?.[d]?.name || "—"}
            </div>
          ))}
        </div>
      )}

      {view === "ricette" && (
        <div>
          {(wd.meals || []).map(m => (
            <div key={m.id} onClick={() => setShowRecipe(m)}>
              {m.name}
            </div>
          ))}
        </div>
      )}

      {showRecipe && (
        <div>
          <h3>{showRecipe.name}</h3>
          <button onClick={() => setShowRecipe(null)}>chiudi</button>
        </div>
      )}

    </div>
  );
}