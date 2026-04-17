import { useState, useCallback, useEffect } from "react";

/* ───────────────────────── CONFIG ───────────────────────── */

const COLORS = ["#D4A96A","#7BAF8E","#5B8DB8","#C4855A","#8FA656","#A67BAF","#AF7B8A","#6AA8AF"];
const EMOJIS = ["🥗","🍝","🌾","🐟","🌯","🥙","🍱","🥘","🫕","🍛","🥦","🫙"];
const DAYS = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì"];

/* ───────────────────────── FALLBACK ───────────────────────── */

const FALLBACK_MEALS = [
  // invariato (tuo array originale)
];

/* ───────────────────────── TIME / WEEK ENGINE ───────────────────────── */

function getISOWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);

  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function emptyPlan() {
  return Object.fromEntries(DAYS.map(d => [d, null]));
}

/* ───────────────────────── VISUALS ───────────────────────── */

function assignVisuals(meals) {
  return meals.map((m, i) => ({
    ...m,
    id: m.id ?? (Date.now() + i + Math.random()),
    color: COLORS[i % COLORS.length],
    emoji: EMOJIS[i % EMOJIS.length]
  }));
}

/* ───────────────────────── SHOPPING LIST ───────────────────────── */

function buildShoppingList(plan) {
  const totals = {};

  DAYS.forEach(day => {
    const m = plan[day];
    if (!m) return;

    const s = m.servings || 1;

    (m.ingredients || []).forEach(ing => {
      if (!totals[ing.name]) {
        totals[ing.name] = { name: ing.name, qty: 0, unit: ing.unit };
      }
      totals[ing.name].qty += ing.qty * s;
    });
  });

  return Object.values(totals);
}

/* ───────────────────────── STORAGE (atomic) ───────────────────────── */

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

/* ───────────────────────── AUTO WEEK ROLLOVER ENGINE ───────────────────────── */

function performWeeklyRollover(prev) {
  const currentKey = getISOWeekKey();
  const lastKey = prev.lastSeenWeek;

  if (currentKey === lastKey) return prev;

  const oldWeek = prev.weeks[lastKey];

  const alreadyArchived = prev.archive.some(a => a.weekKey === lastKey);

  let archive = prev.archive;

  if (oldWeek && !alreadyArchived) {
    archive = [
      { weekKey: lastKey, likedIds: [] },
      ...archive
    ];
  }

  return {
    ...prev,
    archive,
    lastSeenWeek: currentKey
  };
}

/* ───────────────────────── CLAUDE API ───────────────────────── */

const SYSTEM_PROMPT = `Sei un nutrizionista esperto...`; // invariato

async function callClaudeAPI(userMsg) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMsg }]
    })
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();

  const text = (data.content || [])
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("");

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("JSON non valido");

  return JSON.parse(match[0]);
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

  const weekKey = (tab) =>
    tab === "current" ? getISOWeekKey(0) : getISOWeekKey(1);

  const getWeek = (tab) => {
    const key = weekKey(tab);
    return state.weeks[key] || {
      plan: emptyPlan(),
      meals: [],
      locked: false,
      lockedList: null
    };
  };

  /* ───────────────────────── INIT + AUTO ROLLOVER ───────────────────────── */

  useEffect(() => {
    async function init() {
      const stored = await storageGet("mp-v2");

      const base = stored || state;

      const rolled = performWeeklyRollover(base);

      setState(rolled);
      await persistAll(rolled);
    }

    init();
  }, []);

  /* check periodico (app aperta giorni) */
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

  /* ───────────────────────── CENTRAL UPDATE ───────────────────────── */

  const updateWeek = (tab, updater) => {
    const key = weekKey(tab);

    setState(prev => {
      const week = prev.weeks[key] || {
        plan: emptyPlan(),
        meals: [],
        locked: false
      };

      const updatedWeek = updater(week);

      const newWeeks = {
        ...prev.weeks,
        [key]: updatedWeek
      };

      const newArchive = prev.archive.map(a => {
        const w = newWeeks[a.weekKey];
        return w ? { ...a } : a;
      });

      const newState = {
        ...prev,
        weeks: newWeeks,
        archive: newArchive
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
      meals = await callClaudeAPI("Genera 5 ricette...");
    } catch {
      meals = FALLBACK_MEALS.slice(0, 5);
    }

    meals = assignVisuals(meals);

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
      const pick = spare[Math.floor(Math.random() * spare.length)] || FALLBACK_MEALS[0];

      return {
        ...w,
        plan: {
          ...w.plan,
          [day]: { ...pick, servings: 1 }
        }
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
      locked: true,
      lockedList: buildShoppingList(w.plan)
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
      if (prev.archive.find(a => a.weekKey === key)) return prev;

      const newState = {
        ...prev,
        archive: [{ weekKey: key, likedIds: [] }, ...prev.archive]
      };

      persistAll(newState);
      return newState;
    });
  };

  const toggleLike = (weekKey, mealId) => {
    setState(prev => {
      const archive = prev.archive.map(a => {
        if (a.weekKey !== weekKey) return a;

        const liked = a.likedIds || [];

        return {
          ...a,
          likedIds: liked.includes(mealId)
            ? liked.filter(x => x !== mealId)
            : [...liked, mealId]
        };
      });

      const newState = { ...prev, archive };
      persistAll(newState);
      return newState;
    });
  };

  /* ───────────────────────── UI MINIMA ───────────────────────── */

  const wd = getWeek(activeTab);

  return (
    <div style={{ padding: 20 }}>
      <h2>Meal Prep (auto rollover attivo)</h2>

      <button onClick={() => generateWeek(activeTab)}>Genera</button>
      <button onClick={() => lockWeek(activeTab)}>Blocca</button>
      <button onClick={() => unlockWeek(activeTab)}>Sblocca</button>
      <button onClick={() => archiveWeek(activeTab)}>Archivia</button>

      <div style={{ marginTop: 20 }}>
        {DAYS.map(d => (
          <div key={d}>
            <b>{d}</b> {wd.plan[d]?.name || "—"}
            {wd.plan[d] && (
              <>
                <button onClick={() => setServings(activeTab, d, (wd.plan[d].servings || 1) + 1)}>+</button>
                <button onClick={() => swapMeal(activeTab, d)}>swap</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}