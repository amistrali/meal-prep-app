import React, { useState } from "react";

const COLORS = ["#D4A96A","#7BAF8E","#5B8DB8","#C4855A","#8FA656","#A67BAF","#AF7B8A","#6AA8AF"];
const EMOJIS = ["🥗","🍝","🌾","🐟","🌯","🥙","🍱","🥘","🫕","🍛","🥦","🫙"];
const DAYS = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì"];

const FALLBACK_MEALS = [
  { name:"Bowl Farro Pollo", kcal:480, prep:25, servings:1, ingredients:[{name:"Farro",qty:80,unit:"g"}] },
  { name:"Quinoa Ceci Feta", kcal:420, prep:15, servings:1, ingredients:[{name:"Quinoa",qty:70,unit:"g"}] },
  { name:"Riso Tonno", kcal:450, prep:20, servings:1, ingredients:[{name:"Riso",qty:80,unit:"g"}] },
  { name:"Wrap Hummus", kcal:380, prep:10, servings:1, ingredients:[{name:"Tortilla",qty:1,unit:"pz"}] },
  { name:"Pasta Lenticchie", kcal:510, prep:20, servings:1, ingredients:[{name:"Pasta",qty:80,unit:"g"}] }
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

function assignVisuals(meals) {
  return meals.map((m,i) => ({
    ...m,
    id: Date.now() + i,
    color: COLORS[i % COLORS.length],
    emoji: EMOJIS[i % EMOJIS.length]
  }));
}

function buildShoppingList(plan) {
  const out = {};
  DAYS.forEach(d => {
    const m = plan[d];
    if (!m) return;
    (m.ingredients || []).forEach(i => {
      if (!out[i.name]) out[i.name] = { name:i.name, qty:0, unit:i.unit };
      out[i.name].qty += i.qty * (m.servings || 1);
    });
  });
  return Object.values(out);
}

export default function App() {

  const [weeks, setWeeks] = useState({});
  const [view, setView] = useState("planner");

  const [showRecipe, setShowRecipe] = useState(null);

  const key = getWeekKey();
  const current = weeks[key] || { plan: emptyPlan(), meals: [] };

  const generateWeek = () => {
    const meals = assignVisuals([...FALLBACK_MEALS]);
    const plan = Object.fromEntries(DAYS.map((d,i)=>[d, meals[i]]));

    setWeeks({
      ...weeks,
      [key]: { plan, meals }
    });
  };

  const swapMeal = (day) => {
    const meals = current.meals;
    const pick = meals[Math.floor(Math.random() * meals.length)];

    const newPlan = { ...current.plan, [day]: pick };

    setWeeks({
      ...weeks,
      [key]: { ...current, plan: newPlan }
    });
  };

  const plan = current.plan;

  return (
    <div style={{ fontFamily:"Georgia", padding:20 }}>

      <div style={{ marginBottom:10 }}>
        <button onClick={() => setView("planner")}>Planner</button>
        <button onClick={() => setView("ricette")}>Ricette</button>
      </div>

      {view === "planner" && (
        <div>
          <button onClick={generateWeek}>Genera settimana</button>

          {DAYS.map(d => (
            <div key={d} style={{ marginTop:10 }}>
              <strong>{d}</strong>{" "}
              {plan[d]?.name || "—"}
              {plan[d] && (
                <button onClick={() => swapMeal(d)} style={{ marginLeft:10 }}>
                  swap
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {view === "ricette" && (
        <div>
          {current.meals.map(m => (
            <div key={m.id} onClick={() => setShowRecipe(m)}>
              {m.name}
            </div>
          ))}
        </div>
      )}

      {showRecipe && (
        <div style={{ marginTop:20 }}>
          <h3>{showRecipe.name}</h3>
          <button onClick={() => setShowRecipe(null)}>chiudi</button>
        </div>
      )}

    </div>
  );
}