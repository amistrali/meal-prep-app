import { useState, useCallback } from "react";

const COLORS = ["#D4A96A","#7BAF8E","#5B8DB8","#C4855A","#8FA656","#A67BAF","#AF7B8A","#6AA8AF"];
const EMOJIS = ["🥗","🍝","🌾","🐟","🌯","🥙","🍱","🥘"];
const DAYS = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì"];

const FALLBACK_MEALS = [
  { id:1,name:"Farro pollo",kcal:480,prep:25,servings:1,ingredients:[{name:"Farro",qty:80,unit:"g"}],steps:["Cuoci"] },
  { id:2,name:"Quinoa ceci",kcal:420,prep:15,servings:1,ingredients:[{name:"Quinoa",qty:70,unit:"g"}],steps:["Cuoci"] },
  { id:3,name:"Riso tonno",kcal:450,prep:20,servings:1,ingredients:[{name:"Riso",qty:80,unit:"g"}],steps:["Cuoci"] },
  { id:4,name:"Wrap veg",kcal:380,prep:10,servings:1,ingredients:[{name:"Wrap",qty:1,unit:"pz"}],steps:["Farcisci"] },
  { id:5,name:"Pasta lenticchie",kcal:510,prep:20,servings:1,ingredients:[{name:"Pasta",qty:80,unit:"g"}],steps:["Cuoci"] },
];

function assignVisuals(meals){
  return meals.map((m,i)=>({
    ...m,
    color:COLORS[i%COLORS.length],
    emoji:EMOJIS[i%EMOJIS.length]
  }));
}

function buildShoppingList(plan){
  const t={};
  DAYS.forEach(d=>{
    const m=plan[d];
    if(!m) return;
    (m.ingredients||[]).forEach(i=>{
      if(!t[i.name]) t[i.name]={name:i.name,qty:0,unit:i.unit};
      t[i.name].qty+=i.qty*(m.servings||1);
    });
  });
  return Object.values(t);
}

const emptyPlan=()=>Object.fromEntries(DAYS.map(d=>[d,null]));

export default function App(){

  const [weeks,setWeeks]=useState({});
  const [archive,setArchive]=useState([]);
  const [activeTab,setActiveTab]=useState("current");
  const [view,setView]=useState("planner");
  const [notification,setNotification]=useState("");

  const weekKey=(tab)=>tab==="current"?"W1":"W2";

  const getWeek=()=>weeks[weekKey(activeTab)]||{plan:emptyPlan(),meals:[]};

  const persist=(w,a)=>{
    setWeeks(w);
    setArchive(a);
  };

  const notify=(m)=>{
    setNotification(m);
    setTimeout(()=>setNotification(""),1500);
  };

  const generate=()=>{
    const meals=assignVisuals([...FALLBACK_MEALS]);
    const plan=Object.fromEntries(DAYS.map((d,i)=>[d,meals[i]]));
    const w={...weeks,[weekKey(activeTab)]:{plan,meals}};
    persist(w,archive);
    notify("Generato");
  };

  const archiveWeek=()=>{
    const wk=weekKey(activeTab);
    const w=getWeek();
    setArchive([{weekKey:wk,plan:w.plan,meals:w.meals},...archive]);
    notify("Archiviato");
  };

  const toggleLike=(weekKey,id)=>{
    const updated=archive.map(a=>{
      if(a.weekKey!==weekKey) return a;
      const liked=a.liked||[];
      return {...a,liked:liked.includes(id)?liked.filter(x=>x!==id):[...liked,id]};
    });
    setArchive(updated);
  };

  const current=getWeek();

  return (
    <div style={{padding:20,fontFamily:"sans-serif"}}>

      {notification && <div>{notification}</div>}

      <div>
        <button onClick={()=>setView("planner")}>Planner</button>
        <button onClick={()=>setView("archive")}>Archivio</button>
      </div>

      {view==="planner" && (
        <div>
          <button onClick={generate}>Genera</button>
          <button onClick={archiveWeek}>Archivia</button>

          <div style={{marginTop:20}}>
            {DAYS.map(d=>(
              <div key={d}>
                <b>{d}</b> {current.plan[d]?.name || "-"}
              </div>
            ))}
          </div>
        </div>
      )}

      {view==="archive" && (
        <div>
          {archive.map(a=>(
            <div key={a.weekKey}>
              <h4>{a.weekKey}</h4>
              {(a.meals||[]).map(m=>(
                <button key={m.id} onClick={()=>toggleLike(a.weekKey,m.id)}>
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