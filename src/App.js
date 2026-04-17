import { useState, useCallback } from "react";

const COLORS = ["#D4A96A","#7BAF8E","#5B8DB8","#C4855A","#8FA656","#A67BAF","#AF7B8A","#6AA8AF"];
const EMOJIS = ["🥗","🍝","🌾","🐟","🌯","🥙","🍱","🥘"];
const DAYS = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì"];

const FALLBACK_MEALS = [
  { id:1,name:"Farro pollo",kcal:480,prep:25,servings:1,ingredients:[{name:"Farro",qty:80,unit:"g"}] },
  { id:2,name:"Quinoa ceci",kcal:420,prep:15,servings:1,ingredients:[{name:"Quinoa",qty:70,unit:"g"}] },
  { id:3,name:"Riso tonno",kcal:450,prep:20,servings:1,ingredients:[{name:"Riso",qty:80,unit:"g"}] },
  { id:4,name:"Wrap veg",kcal:380,prep:10,servings:1,ingredients:[{name:"Wrap",qty:1,unit:"pz"}] },
  { id:5,name:"Pasta lenticchie",kcal:510,prep:20,servings:1,ingredients:[{name:"Pasta",qty:80,unit:"g"}] },
];

function assignVisuals(meals){
  return meals.map((m,i)=>({
    ...m,
    color:COLORS[i % COLORS.length],
    emoji:EMOJIS[i % EMOJIS.length]
  }));
}

function buildShoppingList(plan){
  const totals = {};
  DAYS.forEach(day=>{
    const meal = plan[day];
    if(!meal) return;

    (meal.ingredients || []).forEach(i=>{
      if(!totals[i.name]){
        totals[i.name] = { name:i.name, qty:0, unit:i.unit };
      }
      totals[i.name].qty += i.qty * (meal.servings || 1);
    });
  });

  return Object.values(totals);
}

const emptyPlan = () =>
  Object.fromEntries(DAYS.map(d => [d, null]));

export default function App() {

  const [weeks, setWeeks] = useState({});
  const [archive, setArchive] = useState([]);
  const [activeTab, setActiveTab] = useState("current");
  const [view, setView] = useState("planner");
  const [notification, setNotification] = useState("");

  const weekKey = (tab) => tab;

  const getWeek = (tab) =>
    weeks[weekKey(tab)] || { plan: emptyPlan(), meals: [] };

  const persist = (w, a) => {
    setWeeks(w);
    setArchive(a);
  };

  const notify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 1500);
  };

  const generateWeek = useCallback(() => {
    const meals = assignVisuals([...FALLBACK_MEALS]);
    const plan = Object.fromEntries(DAYS.map((d,i)=>[d, meals[i]]));

    const newWeeks = {
      ...weeks,
      [weekKey(activeTab)]: { plan, meals }
    };

    persist(newWeeks, archive);
    notify("Settimana generata");
  }, [weeks, archive, activeTab]);

  const archiveWeek = () => {
    const wk = getWeek(activeTab);

    const newArchive = [
      { weekKey: activeTab, plan: wk.plan, meals: wk.meals },
      ...archive
    ];

    persist(weeks, newArchive);
    notify("Archiviata");
  };

  const toggleLike = (week, id) => {
    const updated = archive.map(a => {
      if(a.weekKey !== week) return a;

      const liked = a.liked || [];

      return {
        ...a,
        liked: liked.includes(id)
          ? liked.filter(x => x !== id)
          : [...liked, id]
      };
    });

    setArchive(updated);
  };

  const current = getWeek(activeTab);
  const shopping = buildShoppingList(current.plan);

  return (
    <div style={{padding:20,fontFamily:"sans-serif"}}>

      {notification && <div>{notification}</div>}

      <div style={{marginBottom:10}}>
        <button onClick={()=>setActiveTab("current")}>Current</button>
        <button onClick={()=>setActiveTab("next")}>Next</button>
      </div>

      <div style={{marginBottom:10}}>
        <button onClick={()=>setView("planner")}>Planner</button>
        <button onClick={()=>setView("archive")}>Archivio</button>
        <button onClick={generateWeek}>Genera</button>
        <button onClick={archiveWeek}>Archivia</button>
      </div>

      {view === "planner" && (
        <div>
          {DAYS.map(d => (
            <div key={d}>
              <b>{d}</b> — {current.plan[d]?.name || "-"}
            </div>
          ))}

          <h4>Spesa</h4>
          {shopping.map(i => (
            <div key={i.name}>
              {i.name} {i.qty} {i.unit}
            </div>
          ))}
        </div>
      )}

      {view === "archive" && (
        <div>
          {archive.map(a => (
            <div key={a.weekKey}>
              <h4>{a.weekKey}</h4>

              {(a.meals || []).map(m => (
                <button key={m.id} onClick={()=>toggleLike(a.weekKey, m.id)}>
                  ❤️ {m.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}