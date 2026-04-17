import { useState } from "react";

const DAYS = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì"];

const FALLBACK_MEALS = [
  {
    name:"Bowl di Farro con Pollo",
    kcal:480,
    prep:25,
    tags:["proteico"],
    ingredients:[{name:"Farro",qty:80,unit:"g"}],
    steps:["Cuoci il farro","Cuoci il pollo","Assembla"]
  },
  {
    name:"Quinoa Ceci Feta",
    kcal:420,
    prep:15,
    tags:["vegetariano"],
    ingredients:[{name:"Quinoa",qty:70,unit:"g"}],
    steps:["Cuoci quinoa","Aggiungi ceci"]
  },
  {
    name:"Riso Tonno",
    kcal:450,
    prep:20,
    tags:["pesce"],
    ingredients:[{name:"Riso",qty:80,unit:"g"}],
    steps:["Cuoci riso","Aggiungi tonno"]
  },
  {
    name:"Wrap Vegano",
    kcal:380,
    prep:10,
    tags:["vegano"],
    ingredients:[{name:"Tortilla",qty:1,unit:"pz"}],
    steps:["Farcisci","Arrotola"]
  },
  {
    name:"Pasta Lenticchie",
    kcal:510,
    prep:20,
    tags:["legumi"],
    ingredients:[{name:"Pasta",qty:80,unit:"g"}],
    steps:["Cuoci pasta","Condisci"]
  }
];

// ✅ FIX: chiamata backend (no CORS)
async function callClaudeAPI(userMsg) {
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ userMsg })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err || "Errore API");
  }

  const data = await response.json();

  const text = (data.content || [])
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("");

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("JSON non trovato");

  return JSON.parse(match[0]);
}

export default function App() {
  const [plan, setPlan] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateWeek = async () => {
    setLoading(true);
    setError("");

    let meals;

    try {
      meals = await callClaudeAPI(
        "Genera 5 ricette meal prep diverse"
      );
    } catch (e) {
      console.error(e);
      meals = FALLBACK_MEALS;
      setError("API non disponibile, uso fallback");
    }

    const newPlan = {};
    DAYS.forEach((d, i) => {
      newPlan[d] = meals[i];
    });

    setPlan(newPlan);
    setLoading(false);
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Meal Prep Planner</h1>

      <button onClick={generateWeek} disabled={loading}>
        {loading ? "Caricamento..." : "Genera Piano"}
      </button>

      {error && (
        <p style={{ color: "orange" }}>{error}</p>
      )}

      <div style={{ marginTop: 20 }}>
        {DAYS.map(day => (
          <div key={day} style={{ marginBottom: 10 }}>
            <strong>{day}:</strong>{" "}
            {plan[day]?.name || "—"}
          </div>
        ))}
      </div>
    </div>
  );
}