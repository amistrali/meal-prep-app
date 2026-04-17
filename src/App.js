import { useState, useEffect } from "react";

/* ───────────────────────── CONFIG ───────────────────────── */

const COLORS = ["#D4A96A","#7BAF8E","#5B8DB8","#C4855A","#8FA656","#A67BAF","#AF7B8A","#6AA8AF"];
const EMOJIS = ["🥗","🍝","🌾","🐟","🌯","🥙","🍱","🥘","🫕","🍛","🥦","🫙"];
const DAYS = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì"];

/* ───────────────────────── FALLBACK ───────────────────────── */

const FALLBACK_MEALS = [
  { name:"Bowl Farro", kcal:480, prep:25, servings:1, tags:["proteico"], ingredients:[{name:"Farro",qty:80,unit:"g"}], steps:["Cuoci farro"] },
  { name:"Quinoa Ceci", kcal:420, prep:15, servings:1, tags:["veg"], ingredients:[{name:"Quinoa",qty:70,unit:"g"}], steps:["Cuoci quinoa"] },
  { name:"Riso Tonno", kcal:450, prep:20, servings:1, tags:["pesce"], ingredients:[{name:"Riso",qty:80,unit:"g"}], steps:["Cuoci riso"] },
  { name:"Wrap Veg", kcal:380, prep:10, servings:1, tags:["vegano"], ingredients:[{name:"Tortilla",qty:1,unit:"pz"}], steps:["Arrotola"] },
  { name:"Pasta Lenticchie", kcal:510, prep:20, servings:1, tags:["veg"], ingredients:[{name:"Pasta",qty:80,unit:"g"}], steps:["Cuoci pasta"] }
];

/* ───────────────────────── WEEK ENGINE ───────────────────────── */

function getISOWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

const emptyPlan = () => Object.fromEntries(DAYS.map(d => [d, null]));

function assignVisuals(meals) {
  return meals.map((m, i) => ({
    ...m,
    id: m.id ?? (Date.now() + i + Math.random()),
    color: COLORS[i % COLORS.length],
    emoji: EMOJIS[i % EMOJIS.length]
  }));
}

/* ───────────────────────── STORAGE ───────────────────────── */

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

async function persistAll(state) {
  await storageSet("mp-v2", state);
}

/* ───────────────────────── AUTO ROLLOVER ───────────────────────── */

function performWeeklyRollover(prev) {
  const currentKey = getISOWeekKey();

  if (prev.lastSeenWeek === currentKey) return prev;

  const oldKey = prev.lastSeenWeek;
  const oldWeek = prev.weeks[oldKey];

  const alreadyArchived = prev.archive.some(a => a.weekKey === oldKey);

  let archive = prev.archive;

  if (oldWeek && !alreadyArchived) {
    archive = [{ weekKey: oldKey, likedIds: [] }, ...archive];
  }

  return {
    ...prev,
    archive,
    lastSeenWeek: currentKey
  };
}

/* ───────────────────────── APP ───────────────────────── */

export default function App() {
  const [state, setState] = useState({
    version: 3,
    weeks: {},
    archive: [],
    prefs: "",
    lastSeenWeek: getISOWeekKey()
  });

  const [activeTab, setActiveTab] = useState("current");
  const [view, setView] = useState("planner");
  const [loading, setLoading] = useState(false);

  const weekKey = (tab) => tab === "current" ? getISOWeekKey() : getISOWeekKey(1);

  const getWeek = (tab) => {
    const key = weekKey(tab);
    return state.weeks[key] || {
      plan: emptyPlan(),
      meals: [],
      locked: false,
      lockedList: null
    };
  };

  /* ───────────────────────── INIT + ROLLOVER SAFE ───────────────────────── */

  useEffect(() => {
    async function init() {
      const stored = await storageGet("mp-v2");

      const base = stored || {
        version: 3,
        weeks: {},
        archive: [],
        prefs: "",
        lastSeenWeek: getISOWeekKey()
      };

      const rolled = performWeeklyRollover(base);

      setState(rolled);
      await persistAll(rolled);
    }

    init();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const rolled = performWeeklyRollover(prev);

        if (rolled === prev) return prev;

        persistAll(rolled);
        return rolled;
      });
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  /* ───────────────────────── UPDATE CORE ───────────────────────── */

  const updateWeek = (tab, updater) => {
    const key = weekKey(tab);

    setState(prev => {
      const week = prev.weeks[key] || {
        plan: emptyPlan(),
        meals: [],
        locked: false
      };

      const updated = updater(week);

      const newWeeks = {
        ...prev.weeks,
        [key]: updated
      };

      const newState = {
        ...prev,
        weeks: newWeeks
      };

      persistAll(newState);
      return newState;
    });
  };

  /* ───────────────────────── ACTIONS ───────────────────────── */

  const generateWeek = async (tab) => {
    setLoading(true);

    let meals;
    try {
      meals = assignVisuals(FALLBACK_MEALS);
    } catch {
      meals = assignVisuals(FALLBACK_MEALS);
    }

    updateWeek(tab, () => ({
      plan: Object.fromEntries(DAYS.map((d, i) => [d, { ...meals[i], servings: 1 }])),
      meals,
      locked: false,
      lockedList: null
    }));

    setLoading(false);
  };

  const swapMeal = (tab, day) => {
    updateWeek(tab, (w) => {
      const ids = DAYS.map(d => w.plan[d]?.id);
      const spare = w.meals.filter(m => !ids.includes(m.id));
      const pick = spare[0] || FALLBACK_MEALS[0];

      return {
        ...w,
        plan: { ...w.plan, [day]: { ...pick, servings: 1 } }
      };
    });
  };

  const setServings = (tab, day, n) => {
    updateWeek(tab, (w) => ({
      ...w,
      plan: {
        ...w.plan,
        [day]: {
          ...w.plan[day],
          servings: Math.max(1, Math.min(10, n))
        }
      }
    }));
  };

  const lockWeek = (tab) => {
    updateWeek(tab, (w) => ({
      ...w,
      locked: true
    }));
  };

  const unlockWeek = (tab) => {
    updateWeek(tab, (w) => ({
      ...w,
      locked: false
    }));
  };

  const archiveWeek = (tab) => {
    const key = weekKey(tab);

    setState(prev => {
      if (prev.archive.some(a => a.weekKey === key)) return prev;

      const newState = {
        ...prev,
        archive: [{ weekKey: key, likedIds: [] }, ...prev.archive]
      };

      persistAll(newState);
      return newState;
    });
  };

  /* ───────────────────────── UI ───────────────────────── */

  const wd = getWeek(activeTab);

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h2>Meal Prep System</h2>

      <button onClick={() => generateWeek(activeTab)}>Genera</button>
      <button onClick={() => lockWeek(activeTab)}>Blocca</button>
      <button onClick={() => unlockWeek(activeTab)}>Sblocca</button>
      <button onClick={() => archiveWeek(activeTab)}>Archivia</button>

      <div style={{ marginTop: 20 }}>
        {DAYS.map(day => (
          <div key={day} style={{ marginBottom: 10 }}>
            <b>{day}</b> — {wd.plan[day]?.name || "—"}

            {wd.plan[day] && (
              <>
                <button onClick={() => setServings(activeTab, day, (wd.plan[day].servings || 1) + 1)}>+</button>
                <button onClick={() => swapMeal(activeTab, day)}>swap</button>
              </>
            )}
          </div>
        ))}
      </div>

      {loading && <p>Generazione...</p>}
    </div>
  );
}