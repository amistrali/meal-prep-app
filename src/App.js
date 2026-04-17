import React, { useState, useEffect } from "react";

const DAYS = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì"];

const FALLBACK = [
  { name:"Farro e pollo" },
  { name:"Quinoa e ceci" },
  { name:"Riso tonno" },
  { name:"Wrap hummus" },
  { name:"Pasta lenticchie" }
];

function getWeekKey() {
  const d = new Date();
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const wn = Math.ceil(((d - jan4) / 86400000 + jan4.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(wn).padStart(2,"0")}`;
}

function emptyPlan() {
  return Object.fromEntries(DAYS.map(d => [d, null]));
}

export default function App() {

  const [weeks, setWeeks] = useState({});
  const [activeTab, setActiveTab] = useState("current");
  const [view, setView] = useState("planner");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  const weekKey = () => getWeekKey();

  const getWeek = () => {
    const k = weekKey();
    return weeks[k] || { plan: emptyPlan(), meals: [] };
  };

  const generate = () => {
    setLoading(true);
    setLoadingMsg("Generazione...");

    const meals = FALLBACK;
    const plan = Object.fromEntries(DAYS.map((d,i)=>[d, meals[i]]));

    const newWeeks = {
      ...weeks,
      [weekKey()]: { plan, meals }
    };

    setWeeks(newWeeks);

    setTimeout(() => {
      setLoading(false);
      setLoadingMsg("");
    }, 500);
  };

  const w = getWeek();

  if (loading) {
    return (
      <div style={{ padding:20 }}>
        {loadingMsg}
      </div>
    );
  }

  return (
    <div style={{ fontFamily:"Arial" }}>

      <div style={{ marginBottom:10 }}>
        <button onClick={() => setView("planner")}>Planner</button>
        <button onClick={() => setView("ricette")}>Ricette</button>
      </div>

      {view === "planner" && (
        <div>
          <button onClick={generate}>Genera settimana</button>

          {DAYS.map(d => (
            <div key={d}>
              <strong>{d}</strong> {w.plan[d]?.name || "—"}
            </div>
          ))}
        </div>
      )}

      {view === "ricette" && (
        <div>
          {(w.meals || []).map((m,i) => (
            <div key={i}>{m.name}</div>
          ))}
        </div>
      )}

    </div>
  );
}