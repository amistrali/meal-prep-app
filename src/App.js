import { useState, useCallback, useEffect } from "react";

const COLORS = ["#D4A96A","#7BAF8E","#5B8DB8","#C4855A","#8FA656","#A67BAF","#AF7B8A","#6AA8AF"];
const EMOJIS = ["🥗","🍝","🌾","🐟","🌯","🥙","🍱","🥘","🫕","🍛","🥦","🫙"];
const DAYS = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì"];

const FALLBACK_MEALS = [
  { name:"Bowl di Farro con Pollo", kcal:480, prep:25, servings:1, tags:["proteico","cereali"], ingredients:[{name:"Farro perlato",qty:80,unit:"g"}], steps:["Cuoci","Assembla"] },
  { name:"Quinoa con Ceci e Feta", kcal:420, prep:15, servings:1, tags:["vegetariano"], ingredients:[{name:"Quinoa",qty:70,unit:"g"}], steps:["Cuoci","Mescola"] },
  { name:"Riso con Tonno", kcal:450, prep:20, servings:1, tags:["pesce"], ingredients:[{name:"Riso",qty:80,unit:"g"}], steps:["Cuoci","Unisci"] },
  { name:"Wrap Veg", kcal:380, prep:10, servings:1, tags:["vegano"], ingredients:[{name:"Tortilla",qty:1,unit:"pz"}], steps:["Farcisci","Arrotola"] },
  { name:"Pasta Lenticchie", kcal:510, prep:20, servings:1, tags:["vegetariano"], ingredients:[{name:"Pasta",qty:80,unit:"g"}], steps:["Cuoci","Condisci"] },
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
    id: m.id ?? (Date.now() + i + Math.random()),
    color: COLORS[i % COLORS.length],
    emoji: EMOJIS[i % EMOJIS.length]
  }));
}

function buildShoppingList(plan) {
  const totals = {};
  DAYS.forEach(d => {
    const m = plan[d];
    if (!m) return;
    (m.ingredients || []).forEach(i => {
      if (!totals[i.name]) totals[i.name] = { name:i.name, qty:0, unit:i.unit };
      totals[i.name].qty += i.qty * (m.servings || 1);
    });
  });
  return Object.values(totals);
}

function diffLists(prev, curr) {
  const pm = Object.fromEntries(prev.map(i => [i.name, i]));
  const cm = Object.fromEntries(curr.map(i => [i.name, i]));
  return {
    added: curr.filter(i => !pm[i.name]),
    removed: prev.filter(i => !cm[i.name]),
    changed: curr.filter(i => pm[i.name] && pm[i.name].qty !== i.qty)
  };
}

const emptyPlan = () => Object.fromEntries(DAYS.map(d => [d, null]));

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

  const [diffModal, setDiffModal] = useState(null);
  const [archiveDetail, setArchiveDetail] = useState(null);
  const [showPrefs, setShowPrefs] = useState(false);

  const [ready, setReady] = useState(true);
  const [apiError, setApiError] = useState("");

  const weekKey = (tab) => tab === "current" ? getWeekKey(0) : getWeekKey(1);

  const getWD = (tab) =>
    weeks[weekKey(tab)] || { plan: emptyPlan(), locked:false, meals:[] };

  const persist = useCallback((w,a,p) => {
    setWeeks(w); setArchive(a); setPrefs(p);
  }, []);

  const notify = (m) => {
    setNotification(m);
    setTimeout(()=>setNotification(""),2000);
  };

  const generateWeek = async (tab) => {
    setLoading(true);
    setLoadingMsg("Generazione...");
    try {
      const meals = assignVisuals([...FALLBACK_MEALS]);
      const plan = Object.fromEntries(DAYS.map((d,i)=>[d, meals[i]]));
      const key = weekKey(tab);
      const newWeeks = {...weeks,[key]:{plan,meals,locked:false}};
      persist(newWeeks,archive,prefs);
      notify("Generato");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  const archiveWeek = (tab) => {
    const key = weekKey(tab);
    const wd = getWD(tab);
    const newArchive = [{weekKey:key,plan:wd.plan,meals:wd.meals},...archive];
    persist(weeks,newArchive,prefs);
    notify("Archiviato");
  };

  const toggleLike = (wk,id) => {
    const newArchive = archive.map(a=>{
      if(a.weekKey!==wk) return a;
      const liked = a.likedIds||[];
      return {...a, likedIds: liked.includes(id)?liked.filter(x=>x!==id):[...liked,id]};
    });
    persist(weeks,newArchive,prefs);
  };

  if (!ready) return <div>Loading...</div>;

  const wd = getWD(activeTab);

  return (
    <div>
      {notification && <div>{notification}</div>}

      {loading && <div>{loadingMsg}</div>}

      {diffModal && <div onClick={()=>setDiffModal(null)}>Diff</div>}

      <header>
        <button onClick={()=>setView("planner")}>Planner</button>
        <button onClick={()=>setView("archivio")}>Archivio</button>
      </header>

      {view==="planner" && (
        <div>
          <button onClick={()=>generateWeek(activeTab)}>Genera</button>
          <button onClick={()=>archiveWeek(activeTab)}>Archive</button>
        </div>
      )}

      {view==="archivio" && (
        <div>
          {archive.map(a=>(
            <div key={a.weekKey} onClick={()=>setArchiveDetail(a.weekKey)}>
              {a.weekKey}
              {(a.meals||[]).map(m=>(
                <button key={m.id} onClick={()=>toggleLike(a.weekKey,m.id)}>❤️</button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}