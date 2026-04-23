import { useState, useCallback, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

// ── FIREBASE CONFIG ────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FB_API_KEY || "AIzaSyD9CxZxjoOJp89DJSdFF2H-73oeKtRqq7M",
  authDomain: process.env.REACT_APP_FB_AUTH_DOMAIN || "meal-prep-studio.firebaseapp.com",
  projectId: process.env.REACT_APP_FB_PROJECT_ID || "meal-prep-studio",
  storageBucket: "meal-prep-studio.firebasestorage.app",
  messagingSenderId: "439901909097",
  appId: process.env.REACT_APP_FB_APP_ID || "1:439901909097:web:dd624037ebeb164c05b2f8"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

// ── FIREBASE CONFIG ────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FB_API_KEY || "AIzaSyD9CxZxjoOJp89DJSdFF2H-73oeKtRqq7M",
  authDomain: process.env.REACT_APP_FB_AUTH_DOMAIN || "meal-prep-studio.firebaseapp.com",
  projectId: process.env.REACT_APP_FB_PROJECT_ID || "meal-prep-studio",
  storageBucket: "meal-prep-studio.firebasestorage.app",
  messagingSenderId: "439901909097",
  appId: process.env.REACT_APP_FB_APP_ID || "1:439901909097:web:dd624037ebeb164c05b2f8"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();

const COLORS = ["#D4A96A","#7BAF8E","#5B8DB8","#C4855A","#8FA656","#A67BAF","#AF7B8A","#6AA8AF"];
const EMOJIS = ["🥗","🍝","🌾","🐟","🌯","🥙","🍱","🥘","🫕","🍛","🥦","🫙"];
const DAYS = ["Lunedì","Martedì","Mercoledì","Giovedì","Venerdì"];

const FALLBACK_MEALS = [
  { name:"Bowl di Farro con Pollo", kcal:480, prep:25, servings:1, tags:["proteico","cereali"], imageQuery:"farro bowl chicken grilled vegetables healthy", recipeUrl:"https://www.giallozafferano.it/ricette/farro.html", videoQuery:"bowl di farro con pollo ricetta", ingredients:[{name:"Farro perlato",qty:80,unit:"g"},{name:"Petto di pollo",qty:120,unit:"g"},{name:"Zucchine",qty:1,unit:"pz"},{name:"Pomodorini",qty:100,unit:"g"},{name:"Olio EVO",qty:1,unit:"cucchiaio"}], steps:["Cuoci il farro 20 min in acqua salata, scola e raffredda.","Taglia il pollo a cubetti, saltalo con olio e timo 8 min.","Grigliale le zucchine 3-4 min per lato.","Assembla il bowl e condisci con olio e limone.","Conserva in contenitore ermetico fino a 3 giorni."] },
  { name:"Quinoa con Ceci e Feta", kcal:420, prep:15, servings:1, tags:["vegetariano","legumi"], imageQuery:"quinoa chickpea feta salad bowl healthy", recipeUrl:"https://www.giallozafferano.it/ricette/quinoa.html", videoQuery:"insalata quinoa ceci feta ricetta", ingredients:[{name:"Quinoa",qty:70,unit:"g"},{name:"Ceci cotti",qty:150,unit:"g"},{name:"Feta",qty:50,unit:"g"},{name:"Cetriolo",qty:0.5,unit:"pz"},{name:"Olio EVO",qty:1,unit:"cucchiaio"}], steps:["Cuoci la quinoa in acqua 2:1 per 15 min, raffredda.","Taglia cetriolo e peperone a cubetti.","Mescola tutto con feta sbriciolata.","Condisci con olio e aceto di mele.","Conserva 3-4 giorni in frigo."] },
  { name:"Riso Integrale con Tonno", kcal:450, prep:20, servings:1, tags:["pesce","omega-3"], imageQuery:"brown rice tuna bowl edamame healthy meal prep", recipeUrl:"https://www.giallozafferano.it/ricette/riso-integrale.html", videoQuery:"riso integrale tonno ricetta pranzo", ingredients:[{name:"Riso integrale",qty:80,unit:"g"},{name:"Tonno al naturale",qty:130,unit:"g"},{name:"Edamame",qty:80,unit:"g"},{name:"Mais",qty:50,unit:"g"},{name:"Salsa di soia",qty:1,unit:"cucchiaino"}], steps:["Cuoci il riso integrale 30-35 min.","Cuoci gli edamame 3 min.","Spezzetta il tonno con una forchetta.","Assembla con soia e zenzero.","Cospargi di semi di sesamo."] },
  { name:"Wrap con Hummus e Verdure", kcal:380, prep:10, servings:1, tags:["vegano","veloce"], imageQuery:"wrap hummus vegetables avocado spinach healthy", recipeUrl:"https://www.giallozafferano.it/ricette/wrap.html", videoQuery:"wrap hummus verdure vegano ricetta", ingredients:[{name:"Tortilla integrale",qty:1,unit:"pz"},{name:"Hummus",qty:80,unit:"g"},{name:"Carote",qty:1,unit:"pz"},{name:"Spinaci",qty:40,unit:"g"},{name:"Avocado",qty:0.5,unit:"pz"}], steps:["Stendi l'hummus sulla tortilla.","Aggiungi spinaci, carote grattugiate e avocado.","Spremi il limone sopra.","Arrotola stretto e taglia a metà.","Avvolgi nella pellicola, si conserva 1 giorno."] },
  { name:"Pasta Lenticchie e Pesto Rucola", kcal:510, prep:20, servings:1, tags:["vegetariano","proteico"], imageQuery:"lentil pasta arugula pesto healthy italian", recipeUrl:"https://www.giallozafferano.it/ricette/pasta-lenticchie.html", videoQuery:"pasta lenticchie pesto rucola ricetta", ingredients:[{name:"Pasta di lenticchie",qty:80,unit:"g"},{name:"Rucola",qty:40,unit:"g"},{name:"Parmigiano",qty:20,unit:"g"},{name:"Noci",qty:20,unit:"g"},{name:"Olio EVO",qty:2,unit:"cucchiai"}], steps:["Cuoci la pasta 1 min meno del dovuto.","Frulla rucola, noci, parmigiano e olio.","Condisci la pasta con il pesto.","Aggiungi i ciliegini tagliati.","Conserva 2 giorni in frigo."] },
];

// ── UTILS ──────────────────────────────────────────────────────────────────
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
  const pm = Object.fromEntries((prev||[]).map(i => [i.name, i]));
  const cm = Object.fromEntries((curr||[]).map(i => [i.name, i]));
  return {
    added: curr.filter(i => !pm[i.name]),
    removed: (prev||[]).filter(i => !cm[i.name]),
    changed: curr.filter(i => pm[i.name] && pm[i.name].qty !== i.qty).map(i => ({ ...i, prevQty: pm[i.name].qty }))
  };
}

const emptyPlan = () => Object.fromEntries(DAYS.map(d => [d, null]));

// ── FIREBASE SYNC ─────────────────────────────────────────────────────────
// Salva/carica dati per utente su Firestore (sincronizzazione multi-device)
// Fallback su localStorage se non loggato

async function fbSave(uid, data) {
  if (!uid) {
    try { localStorage.setItem("mp-data", JSON.stringify(data)); } catch {}
    return;
  }
  try {
    await setDoc(doc(db, "users", uid, "data", "main"), data, { merge: true });
  } catch (e) {
    console.error("Firebase save error:", e);
  }
}

async function fbLoad(uid) {
  if (!uid) {
    try {
      const v = localStorage.getItem("mp-data");
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  }
  try {
    const snap = await getDoc(doc(db, "users", uid, "data", "main"));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error("Firebase load error:", e);
    return null;
  }
}

// ── API ────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Sei un nutrizionista esperto in meal prep per pranzi di ufficio.
Genera esattamente 5 ricette DIVERSE tra loro per una settimana lavorativa.
Ogni ricetta: preparabile in anticipo, conservabile 3-4 giorni in frigo, max 30 min di prep, equilibrata e sana, trasportabile in contenitore.
Le 5 devono coprire categorie diverse: cereali integrali, legumi, pesce, carne magra, vegano.
IMPORTANTE: Rispondi ESCLUSIVAMENTE con un array JSON valido, nessun testo prima o dopo, nessun markdown.
Ogni elemento:
{"name":"string","kcal":number,"prep":number,"tags":["string"],
"imageQuery":"breve query in inglese per trovare una foto del piatto (es: 'farro bowl chicken vegetables')",
"recipeUrl":"URL di una ricetta italiana autentica su siti come giallozafferano.it, ricette.it, fattoincasadabenedetta.it, cucchiaio.it — lascia stringa vuota se non sei sicuro",
"videoQuery":"query YouTube in italiano per trovare un video di preparazione (es: 'bowl di farro con pollo ricetta')",
"ingredients":[{"name":"string","qty":number,"unit":"string"}],"steps":["string"]}
qty è sempre riferito a 1 porzione.`;

async function callClaudeAPI(userMsg) {
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  if (!text) throw new Error("Risposta vuota");
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Nessun JSON trovato");
  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Array vuoto");
  return parsed;
}

// ── APP ────────────────────────────────────────────────────────────────────
// ── MEAL IMAGE ────────────────────────────────────────────────────────────
// Usa Pexels API per foto pertinenti (gratuita, 200 req/ora)
// Imposta la tua chiave Pexels nella variabile PEXELS_API_KEY qui sotto

const PEXELS_API_KEY = process.env.REACT_APP_PEXELS_KEY || "";

// Cache in memoria per evitare richieste duplicate nella stessa sessione
const imageCache = {};

async function fetchPexelsImage(query) {
  if (!PEXELS_API_KEY) return null;
  const cacheKey = query.toLowerCase();
  if (imageCache[cacheKey]) return imageCache[cacheKey];
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query + " food dish")}&per_page=5&orientation=landscape`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.photos || data.photos.length === 0) return null;
    // Scegli una foto a caso tra le prime 5 per varietà
    const photo = data.photos[Math.floor(Math.random() * Math.min(3, data.photos.length))];
    const url = photo.src.medium; // 350x233px circa
    imageCache[cacheKey] = url;
    return url;
  } catch { return null; }
}

// Fallback: mappa parole-chiave culinarie -> foto specifiche su Pexels CDN
// (usate quando API key non è impostata)
const FALLBACK_FOOD_PHOTOS = {
  "pollo":      "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=400",
  "chicken":    "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=400",
  "tonno":      "https://images.pexels.com/photos/3655916/pexels-photo-3655916.jpeg?auto=compress&cs=tinysrgb&w=400",
  "tuna":       "https://images.pexels.com/photos/3655916/pexels-photo-3655916.jpeg?auto=compress&cs=tinysrgb&w=400",
  "salmone":    "https://images.pexels.com/photos/3296279/pexels-photo-3296279.jpeg?auto=compress&cs=tinysrgb&w=400",
  "salmon":     "https://images.pexels.com/photos/3296279/pexels-photo-3296279.jpeg?auto=compress&cs=tinysrgb&w=400",
  "pasta":      "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=400",
  "lenticchie": "https://images.pexels.com/photos/5938/food-salad-healthy-lunch.jpg?auto=compress&cs=tinysrgb&w=400",
  "lentil":     "https://images.pexels.com/photos/5938/food-salad-healthy-lunch.jpg?auto=compress&cs=tinysrgb&w=400",
  "quinoa":     "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400",
  "ceci":       "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400",
  "chickpea":   "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400",
  "riso":       "https://images.pexels.com/photos/723198/pexels-photo-723198.jpeg?auto=compress&cs=tinysrgb&w=400",
  "rice":       "https://images.pexels.com/photos/723198/pexels-photo-723198.jpeg?auto=compress&cs=tinysrgb&w=400",
  "farro":      "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400",
  "wrap":       "https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=400",
  "bowl":       "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400",
  "insalata":   "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400",
  "salad":      "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400",
  "hummus":     "https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg?auto=compress&cs=tinysrgb&w=400",
  "uova":       "https://images.pexels.com/photos/824635/pexels-photo-824635.jpeg?auto=compress&cs=tinysrgb&w=400",
  "zuppa":      "https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg?auto=compress&cs=tinysrgb&w=400",
  "soup":       "https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg?auto=compress&cs=tinysrgb&w=400",
  "tofu":       "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400",
  "verdure":    "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400",
  "manzo":      "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=400",
  "beef":       "https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=400",
};

function getFallbackPhoto(query, name) {
  const text = ((query || "") + " " + (name || "")).toLowerCase();
  for (const [key, url] of Object.entries(FALLBACK_FOOD_PHOTOS)) {
    if (text.includes(key)) return url;
  }
  return "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400";
}

function MealImage({ query, name, color, emoji, style }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setImgUrl(null);

    async function load() {
      // Prova prima Pexels API se la chiave è disponibile
      if (PEXELS_API_KEY && query) {
        const url = await fetchPexelsImage(query);
        if (!cancelled && url) {
          setImgUrl(url);
          setStatus("ok");
          return;
        }
      }
      // Fallback sulla mappa locale
      if (!cancelled) {
        const fallback = getFallbackPhoto(query, name);
        setImgUrl(fallback);
        setStatus("fallback");
      }
    }
    load();
    return () => { cancelled = true; };
  }, [query, name]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ ...style, position:"relative", overflow:"hidden", background: `linear-gradient(135deg, ${color||"#D4A96A"}22, ${color||"#7BAF8E"}18)` }}>
      {status === "loading" && (
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ width:20, height:20, border:"2px solid #C8BBA8", borderTopColor:"#7BAF8E", borderRadius:"50%", animation:"spin 1s linear infinite" }} />
        </div>
      )}
      {imgUrl && (
        <img
          src={imgUrl}
          alt={name}
          onLoad={() => setStatus("ok")}
          onError={() => { setStatus("error"); setImgUrl(null); }}
          style={{ width:"100%", height:"100%", objectFit:"cover", display: status === "error" ? "none" : "block" }}
        />
      )}
      {status === "error" && (
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:(style?.height||80) > 80 ? 40 : 22 }}>
          {emoji || "🍽️"}
        </div>
      )}
    </div>
  );
}


export default function App() {
  const [weeks, setWeeks] = useState({});
  const [archive, setArchive] = useState([]);
  const [prefsInput, setPrefsInput] = useState(""); // campo di testo temporaneo
  const [prefsHistory, setPrefsHistory] = useState([]); // tutte le preferenze mai inserite
  const [activePrefs, setActivePrefs] = useState([]); // quelle attualmente selezionate (attive)
  const [activeTab, setActiveTab] = useState("current");
  const [view, setView] = useState("planner");
  const [showRecipe, setShowRecipe] = useState(null);
  const [notification, setNotification] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [diffModal, setDiffModal] = useState(null);
  const [archiveDetail, setArchiveDetail] = useState(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const [ready, setReady] = useState(false);
  const [apiError, setApiError] = useState("");
  const [checkedSl, setCheckedSl] = useState({}); // shopping list item checks

  // Auth listener — carica dati quando utente si logga/cambia
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (firebaseUser) {
        // Carica dati utente da Firestore
        const data = await fbLoad(firebaseUser.uid);
        if (data) {
          if (data.weeks) setWeeks(data.weeks);
          if (data.archive) setArchive(data.archive);
          if (data.prefsHistory) setPrefsHistory(data.prefsHistory);
          if (data.activePrefs) setActivePrefs(data.activePrefs);
        }
        // Ascolta modifiche in tempo reale (sync multi-device)
        const unsubSnap = onSnapshot(
          doc(db, "users", firebaseUser.uid, "data", "main"),
          (snap) => {
            if (snap.exists()) {
              const d = snap.data();
              if (d.weeks) setWeeks(d.weeks);
              if (d.archive) setArchive(d.archive);
              if (d.prefsHistory) setPrefsHistory(d.prefsHistory);
              if (d.activePrefs) setActivePrefs(d.activePrefs);
            }
          }
        );
        return () => unsubSnap();
      } else {
        // Non loggato: carica da localStorage
        try {
          const raw = localStorage.getItem("mp-data");
          if (raw) {
            const d = JSON.parse(raw);
            if (d.weeks) setWeeks(d.weeks);
            if (d.archive) setArchive(d.archive);
            if (d.prefsHistory) setPrefsHistory(d.prefsHistory);
            if (d.activePrefs) setActivePrefs(d.activePrefs);
          }
        } catch {}
      }
      setReady(true);
    });
    return () => unsub();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback((newWeeks, newArchive, newPrefsHistory, newActivePrefs) => {
    const data = {
      weeks: newWeeks,
      archive: newArchive,
      prefsHistory: newPrefsHistory ?? prefsHistory,
      activePrefs: newActivePrefs ?? activePrefs,
    };
    fbSave(user?.uid || null, data);
  }, [user, prefsHistory, activePrefs]);

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(""), 3000); };

  const weekKey = (tab) => tab === "current" ? getWeekKey(0) : getWeekKey(1);
  const getWD = (tab) => weeks[weekKey(tab)] || { plan: emptyPlan(), locked: false, lockedList: null, meals: [] };

  // FIX 1 + 2: ogni volta che il piano della settimana corrente cambia,
  // aggiorna anche l'archivio se quella settimana è già archiviata
  const updateWeeks = useCallback((newWeeks, currentArchive, currentPrefsHistory, currentActivePrefs) => {
    const currentKey = getWeekKey(0);
    const currentWD = newWeeks[currentKey];
    let newArchive = currentArchive;

    if (currentWD) {
      const archivedIdx = currentArchive.findIndex(a => a.weekKey === currentKey);
      if (archivedIdx >= 0) {
        newArchive = currentArchive.map((a, idx) =>
          idx === archivedIdx
            ? { ...a, plan: currentWD.plan, meals: currentWD.meals || [] }
            : a
        );
        setArchive(newArchive);
      }
    }

    setWeeks(newWeeks);
    persist(newWeeks, newArchive, currentPrefsHistory, currentActivePrefs);
    return newArchive;
  }, [persist]);

  // ── GENERATE ──────────────────────────────────────────────────────────────
  const generateWeek = async (tab) => {
    setLoading(true);
    setApiError("");
    setLoadingMsg("Sto generando 5 ricette uniche per la tua settimana...");

    const likedNames = archive.flatMap(a =>
      (a.likedIds || []).map(id => a.meals?.find(m => m.id === id)?.name).filter(Boolean)
    );
    const likedCtx = likedNames.length > 0
      ? ` L'utente apprezza: ${likedNames.slice(0, 8).join(", ")}. Ispirati a questi gusti.`
      : "";
    // Usa activePrefs (quelle selezionate e persistenti)
    const prefsStr = activePrefs.length > 0 ? activePrefs.join(", ") : "";
    const userMsg = `Genera 5 ricette diverse per pranzo da preparare in anticipo.${prefsStr ? " Preferenze/intolleranze: " + prefsStr + "." : ""}${likedCtx} Le 5 ricette devono essere completamente diverse tra loro per ingrediente principale.`;

    let rawMeals;
    let usedFallback = false;

    try {
      rawMeals = await callClaudeAPI(userMsg);
    } catch {
      rawMeals = [...FALLBACK_MEALS].sort(() => Math.random() - 0.5);
      usedFallback = true;
    }

    const meals = assignVisuals(rawMeals.slice(0, 5));
    const plan = Object.fromEntries(DAYS.map((d, i) => [d, { ...meals[i], servings: 1 }]));
    const key = weekKey(tab);

    const newWeeks = { ...weeks, [key]: { plan, locked: false, lockedList: null, meals } };
    updateWeeks(newWeeks, archive, prefsHistory, activePrefs);

    setLoading(false);
    setLoadingMsg("");

    if (usedFallback) {
      setApiError("⚠️ API non raggiungibile: ho caricato ricette di esempio. Verifica che il file api/claude.js sia presente e che la variabile ANTHROPIC_KEY sia impostata su Vercel.");
      notify("📋 Piano caricato con ricette di esempio");
    } else {
      notify("✨ Piano generato con 5 ricette uniche!");
    }
  };

  // ── SWAP ──────────────────────────────────────────────────────────────────
  const swapMeal = async (tab, day) => {
    const wd = getWD(tab);
    if (wd.locked) { notify("🔒 Sblocca prima di modificare."); return; }
    const inPlan = DAYS.map(d => wd.plan[d]?.id).filter(Boolean);
    const spare = (wd.meals || []).filter(m => m.id && !inPlan.includes(m.id));

    if (spare.length > 0) {
      const pick = spare[Math.floor(Math.random() * spare.length)];
      const newPlan = { ...wd.plan, [day]: { ...pick, servings: 1 } };
      const key = weekKey(tab);
      const newWeeks = { ...weeks, [key]: { ...wd, plan: newPlan } };
      updateWeeks(newWeeks, archive, prefsHistory, activePrefs);
      notify("🔄 Sostituita con: " + pick.name);
      return;
    }

    setLoading(true); setLoadingMsg("Cerco una ricetta alternativa...");
    const currentNames = DAYS.map(d => wd.plan[d]?.name).filter(Boolean).join(", ");
    try {
      const prefsStr = activePrefs.length > 0 ? activePrefs.join(", ") : "";
      const parsed = await callClaudeAPI(`Genera UNA ricetta per pranzo, diversa da: ${currentNames}.${prefsStr ? " Preferenze: " + prefsStr : ""} Rispondi con array JSON di 1 elemento.`);
      const meal = assignVisuals([parsed[0]])[0];
      const newMeals = [...(wd.meals || []), meal];
      const newPlan = { ...wd.plan, [day]: { ...meal, servings: 1 } };
      const key = weekKey(tab);
      const newWeeks = { ...weeks, [key]: { ...wd, plan: newPlan, meals: newMeals } };
      updateWeeks(newWeeks, archive, prefsHistory, activePrefs);
      notify("🔄 Sostituita con: " + meal.name);
    } catch {
      const fb = assignVisuals([FALLBACK_MEALS[Math.floor(Math.random() * FALLBACK_MEALS.length)]])[0];
      const newPlan = { ...wd.plan, [day]: { ...fb, servings: 1 } };
      const key = weekKey(tab);
      const newWeeks = { ...weeks, [key]: { ...wd, plan: newPlan } };
      updateWeeks(newWeeks, archive, prefsHistory, activePrefs);
      notify("🔄 Sostituita con ricetta di esempio.");
    }
    setLoading(false); setLoadingMsg("");
  };

  // ── SERVINGS ──────────────────────────────────────────────────────────────
  const setServings = (tab, day, n) => {
    const wd = getWD(tab);
    if (wd.locked) { notify("🔒 Sblocca prima di modificare."); return; }
    const meal = wd.plan[day]; if (!meal) return;
    const newPlan = { ...wd.plan, [day]: { ...meal, servings: Math.max(1, Math.min(10, n)) } };
    const key = weekKey(tab);
    const newWeeks = { ...weeks, [key]: { ...wd, plan: newPlan } };
    updateWeeks(newWeeks, archive, prefsHistory, activePrefs);
  };

  // ── LOCK / UNLOCK ─────────────────────────────────────────────────────────
  const lockWeek = (tab) => {
    const wd = getWD(tab);
    const sl = buildShoppingList(wd.plan);
    if (wd.lockedList) {
      const diff = diffLists(wd.lockedList, sl);
      if (diff.added.length || diff.removed.length || diff.changed.length) setDiffModal(diff);
    }
    const key = weekKey(tab);
    const newWeeks = { ...weeks, [key]: { ...wd, locked: true, lockedList: sl } };
    updateWeeks(newWeeks, archive, prefsHistory, activePrefs);
    notify("🔒 Settimana bloccata!");
  };

  const unlockWeek = (tab) => {
    const wd = getWD(tab);
    const key = weekKey(tab);
    const newWeeks = { ...weeks, [key]: { ...wd, locked: false } };
    updateWeeks(newWeeks, archive, prefsHistory, activePrefs);
    notify("🔓 Settimana sbloccata.");
  };

  // ── ARCHIVE ───────────────────────────────────────────────────────────────
  const archiveWeek = (tab) => {
    const key = weekKey(tab);
    const wd = getWD(tab);
    if (archive.find(a => a.weekKey === key)) { notify("Già archiviata."); return; }
    const newArchive = [{ weekKey: key, plan: wd.plan, meals: wd.meals || [], likedIds: [] }, ...archive];
    setArchive(newArchive);
    persist(weeks, newArchive, prefsHistory, activePrefs);
    notify("📦 Settimana archiviata!");
  };

  const toggleLike = (wk, mealId) => {
    const newArchive = archive.map(a => {
      if (a.weekKey !== wk) return a;
      const liked = a.likedIds || [];
      return { ...a, likedIds: liked.includes(mealId) ? liked.filter(id => id !== mealId) : [...liked, mealId] };
    });
    setArchive(newArchive);
    persist(weeks, newArchive, prefsHistory, activePrefs);
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  // Compute sl here so useEffect can use it (hooks must be before early returns)
  const wd = getWD(activeTab);
  const plan = wd.plan;
  const locked = wd.locked;
  const sl = buildShoppingList(plan);
  const plannedCount = DAYS.filter(d => plan[d]).length;
  const activeSl = sl.filter(i => checkedSl[i.name] !== false);
  const hasData = DAYS.some(d => plan[d]);
  const wLabel = (t) => `${t === "current" ? "Sett. corrente" : "Sett. successiva"} (W${weekKey(t).split("-W")[1]})`;

  // Reset checkedSl to all-checked whenever shopping list content changes
  const slKey = sl.map(i => i.name + i.qty).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setCheckedSl(Object.fromEntries(sl.map(i => [i.name, true]))); }, [slKey]);

  // Auth not yet initialized
  if (!authReady) return (
    <div style={{ minHeight:"100vh", background:"#F5F0E8", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Georgia,serif", color:"#6B5D4F", fontSize:16 }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🥗</div>
        <div>Caricamento...</div>
      </div>
    </div>
  );

  // Not logged in — show login screen
  if (!user) return (
    <div style={{ minHeight:"100vh", background:"#F5F0E8", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Georgia,serif", padding:24 }}>
      <div style={{ maxWidth:380, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:64, marginBottom:16 }}>🥗</div>
        <div style={{ fontSize:11, letterSpacing:4, color:"#9A8A72", textTransform:"uppercase", marginBottom:8 }}>Meal Prep Studio</div>
        <h1 style={{ margin:"0 0 8px", fontSize:28, fontWeight:400, color:"#2C2C2C" }}>
          I tuoi pranzi<br /><span style={{ fontStyle:"italic", color:"#7BAF8E" }}>settimanali</span>
        </h1>
        <p style={{ color:"#6B5D4F", fontSize:14, lineHeight:1.7, margin:"0 0 32px" }}>
          Pianifica i tuoi pranzi, genera ricette con AI e sincronizza tutto tra i tuoi dispositivi.
        </p>
        <button
          onClick={async () => {
            try {
              await signInWithPopup(auth, googleProvider);
            } catch (e) {
              alert("Errore login: " + e.message);
            }
          }}
          style={{
            width:"100%", padding:"14px 24px", borderRadius:40,
            border:"none", background:"#fff", color:"#2C2C2C",
            fontSize:15, cursor:"pointer", fontFamily:"Georgia,serif",
            boxShadow:"0 4px 16px rgba(0,0,0,0.12)",
            display:"flex", alignItems:"center", justifyContent:"center", gap:12,
          }}>
          <img src="https://www.google.com/favicon.ico" alt="G" style={{ width:20, height:20 }} />
          Accedi con Google
        </button>
        <p style={{ color:"#B0A090", fontSize:11, marginTop:16 }}>
          I tuoi dati sono privati e sincronizzati su tutti i tuoi device.
        </p>
      </div>
    </div>
  );

  if (!ready) return (
    <div style={{ minHeight:"100vh", background:"#F5F0E8", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Georgia,serif", color:"#6B5D4F", fontSize:16 }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🥗</div>
        <div>Caricamento dati...</div>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#F5F0E8", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"Georgia,serif", gap:20 }}>
      <div style={{ fontSize:48, animation:"spin 2s linear infinite" }}>🌿</div>
      <div style={{ fontSize:15, color:"#6B5D4F", textAlign:"center", maxWidth:280 }}>{loadingMsg}</div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#F5F0E8", fontFamily:"Georgia,serif" }}>
      <div style={{ position:"fixed", inset:0, backgroundImage:"radial-gradient(circle at 20% 50%,rgba(212,169,106,.08),transparent 60%),radial-gradient(circle at 80% 20%,rgba(123,175,142,.08),transparent 60%)", pointerEvents:"none" }} />

      {notification && <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", background:"#2C2C2C", color:"#F5F0E8", padding:"10px 22px", borderRadius:40, fontSize:13, zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,.25)", whiteSpace:"nowrap" }}>{notification}</div>}

      {diffModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={() => setDiffModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:20, padding:28, maxWidth:460, width:"100%", boxShadow:"0 16px 48px rgba(0,0,0,.25)" }}>
            <h3 style={{ margin:"0 0 16px", fontSize:16, color:"#2C2C2C" }}>📊 Variazioni lista spesa</h3>
            {diffModal.added.length > 0 && <><p style={{ fontSize:11, letterSpacing:2, color:"#7BAF8E", textTransform:"uppercase", margin:"0 0 6px" }}>Aggiunti</p>{diffModal.added.map(i=><div key={i.name} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #F0EBE0", fontSize:13 }}><span style={{color:"#7BAF8E"}}>+ {i.name}</span><span>{i.qty} {i.unit}</span></div>)}</>}
            {diffModal.removed.length > 0 && <><p style={{ fontSize:11, letterSpacing:2, color:"#C47A7A", textTransform:"uppercase", margin:"12px 0 6px" }}>Rimossi</p>{diffModal.removed.map(i=><div key={i.name} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #F0EBE0", fontSize:13 }}><span style={{color:"#C47A7A"}}>− {i.name}</span><span style={{color:"#B0A090"}}>{i.qty} {i.unit}</span></div>)}</>}
            {diffModal.changed.length > 0 && <><p style={{ fontSize:11, letterSpacing:2, color:"#D4A96A", textTransform:"uppercase", margin:"12px 0 6px" }}>Quantità cambiate</p>{diffModal.changed.map(i=><div key={i.name} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #F0EBE0", fontSize:13 }}><span>{i.name}</span><span style={{color:"#D4A96A"}}>{i.prevQty}→{i.qty} {i.unit}</span></div>)}</>}
            {!diffModal.added.length && !diffModal.removed.length && !diffModal.changed.length && <p style={{color:"#9A8A72",fontSize:13}}>Nessuna variazione.</p>}
            <button onClick={() => setDiffModal(null)} style={{ marginTop:18, padding:"9px 22px", borderRadius:40, border:"none", background:"#2C2C2C", color:"#fff", fontSize:13, cursor:"pointer", fontFamily:"Georgia,serif" }}>Chiudi</button>
          </div>
        </div>
      )}

      <header style={{ padding:"22px 24px 0", display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontSize:10, letterSpacing:4, color:"#9A8A72", textTransform:"uppercase", marginBottom:2 }}>Meal Prep Studio</div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:400, color:"#2C2C2C", lineHeight:1.2 }}>I tuoi pranzi <span style={{ fontStyle:"italic", color:"#7BAF8E" }}>settimanali</span></h1>
        </div>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap", paddingTop:4, alignItems:"center" }}>
          {["planner","ricette","spesa","archivio"].map(v => (
            <button key={v} onClick={() => { setView(v); setShowRecipe(null); setArchiveDetail(null); }} style={{ padding:"7px 14px", borderRadius:40, border:view===v?"none":"1.5px solid #C8BBA8", background:view===v?"#2C2C2C":"transparent", color:view===v?"#F5F0E8":"#6B5D4F", fontSize:12, cursor:"pointer", fontFamily:"Georgia,serif" }}>
              {v==="planner"?"📅 Planner":v==="ricette"?"📋 Ricette":v==="spesa"?"🛒 Spesa":"📦 Archivio"}
            </button>
          ))}
          {/* User avatar + logout */}
          <div style={{ display:"flex", alignItems:"center", gap:6, marginLeft:4, paddingLeft:8, borderLeft:"1.5px solid #EDE6D6" }}>
            {user?.photoURL
              ? <img src={user.photoURL} alt="avatar" style={{ width:28, height:28, borderRadius:"50%", objectFit:"cover" }} />
              : <div style={{ width:28, height:28, borderRadius:"50%", background:"#7BAF8E", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:13, fontWeight:600 }}>{(user?.displayName||"U")[0].toUpperCase()}</div>
            }
            <button onClick={() => { if (window.confirm("Vuoi uscire dall'account?")) signOut(auth); }}
              style={{ padding:"4px 10px", borderRadius:20, border:"1.5px solid #C8BBA8", background:"transparent", color:"#9A8A72", fontSize:11, cursor:"pointer", fontFamily:"Georgia,serif" }}>
              Esci
            </button>
          </div>
        </div>
      </header>

      <main style={{ padding:"16px 24px 48px", maxWidth:900, margin:"0 auto" }}>

        {view !== "archivio" && (
          <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
            {["current","next"].map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{ padding:"7px 16px", borderRadius:40, border:activeTab===t?"none":"1.5px solid #C8BBA8", background:activeTab===t?"#4A7A6A":"transparent", color:activeTab===t?"#fff":"#6B5D4F", fontSize:12, cursor:"pointer", fontFamily:"Georgia,serif", display:"flex", alignItems:"center", gap:4 }}>
                {wLabel(t)} {getWD(t).locked ? "🔒" : ""}
              </button>
            ))}
            <div style={{ flex:1 }} />
            {hasData && (locked
              ? <>
                  <button onClick={() => unlockWeek(activeTab)} style={{ padding:"6px 14px", borderRadius:40, border:"1.5px solid #C8BBA8", background:"transparent", color:"#9A8A72", fontSize:12, cursor:"pointer", fontFamily:"Georgia,serif" }}>🔓 Sblocca</button>
                  <button onClick={() => { const diff = diffLists(wd.lockedList || [], sl); setDiffModal(diff); }} style={{ padding:"6px 12px", borderRadius:40, border:"1.5px solid #C8BBA8", background:"transparent", color:"#6B5D4F", fontSize:12, cursor:"pointer" }}>📊 Variazioni</button>
                </>
              : <button onClick={() => lockWeek(activeTab)} style={{ padding:"6px 16px", borderRadius:40, border:"none", background:"#4A7A6A", color:"#fff", fontSize:12, cursor:"pointer", fontFamily:"Georgia,serif" }}>🔒 Blocca</button>
            )}
          </div>
        )}

        {apiError && <div style={{ background:"#FFF8EC", border:"1.5px solid #EDD4A0", borderRadius:12, padding:"10px 16px", fontSize:12, color:"#8A6A2A", marginBottom:14, lineHeight:1.5 }}>{apiError}</div>}

        {/* ── PLANNER ── */}
        {view === "planner" && (
          <div>
            {locked && <div style={{ background:"#E8F5EE", border:"1.5px solid #A8C4B4", borderRadius:10, padding:"9px 14px", fontSize:12, color:"#4A7A6A", marginBottom:12 }}>🔒 Settimana bloccata — ricette fisse. Clicca "Sblocca" per modificare.</div>}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
              <span style={{ color:"#6B5D4F", fontSize:12 }}>{plannedCount}/5 giorni pianificati</span>
              {!locked && (
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => setShowPrefs(!showPrefs)} style={{ padding:"6px 12px", borderRadius:40, border: activePrefs.length > 0 ? "1.5px solid #4A7A6A" : "1.5px solid #C8BBA8", background: activePrefs.length > 0 ? "#E8F5EE" : "transparent", color: activePrefs.length > 0 ? "#4A7A6A" : "#6B5D4F", fontSize:12, cursor:"pointer", fontFamily:"Georgia,serif" }}>⚙️ Preferenze{activePrefs.length > 0 ? ` (${activePrefs.length})` : ""}</button>
                  <button onClick={() => generateWeek(activeTab)} style={{ padding:"6px 16px", borderRadius:40, border:"none", background:"#D4A96A", color:"#fff", fontSize:12, cursor:"pointer", fontFamily:"Georgia,serif", boxShadow:"0 2px 8px rgba(212,169,106,.35)" }}>✨ Genera ricette</button>
                </div>
              )}
            </div>

            {/* Preferenze: tag attivi + storico */}
            {showPrefs && !locked && (
              <div style={{ background:"#fff", borderRadius:12, padding:"14px 16px", border:"1.5px solid #EDE6D6", marginBottom:12 }}>

                {/* Tag attivi */}
                <div style={{ fontSize:10, letterSpacing:2, color:"#9A8A72", textTransform:"uppercase", marginBottom:8 }}>Preferenze attive (sempre usate nella generazione)</div>
                {activePrefs.length === 0
                  ? <div style={{ fontSize:12, color:"#B0A090", marginBottom:10, fontStyle:"italic" }}>Nessuna — le ricette saranno variate liberamente.</div>
                  : <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
                      {activePrefs.map((p, i) => (
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px 5px 12px", borderRadius:20, background:"#4A7A6A", color:"#fff", fontSize:12, fontFamily:"Georgia,serif" }}>
                          <span>{p}</span>
                          <button onClick={() => {
                            const n = activePrefs.filter(x => x !== p);
                            setActivePrefs(n);
                            persist(weeks, archive, prefsHistory, n);
                          }} style={{ background:"rgba(255,255,255,.3)", border:"none", color:"#fff", cursor:"pointer", width:16, height:16, borderRadius:"50%", fontSize:11, display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}>×</button>
                        </div>
                      ))}
                    </div>
                }

                {/* Storico disattivate */}
                {prefsHistory.filter(p => !activePrefs.includes(p)).length > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:10, letterSpacing:2, color:"#9A8A72", textTransform:"uppercase", marginBottom:6 }}>Storico (clicca per riattivare)</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {prefsHistory.filter(p => !activePrefs.includes(p)).map((p, i) => (
                        <button key={i} onClick={() => {
                          const n = [...activePrefs, p];
                          setActivePrefs(n);
                          persist(weeks, archive, prefsHistory, n);
                        }} style={{ padding:"4px 12px", borderRadius:20, border:"1.5px solid #A8C4B8", background:"transparent", color:"#4A7A6A", fontSize:12, cursor:"pointer", fontFamily:"Georgia,serif" }}>
                          + {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Aggiungi nuova */}
                <div style={{ fontSize:10, letterSpacing:2, color:"#9A8A72", textTransform:"uppercase", marginBottom:6 }}>Aggiungi nuova preferenza</div>
                <div style={{ display:"flex", gap:8 }}>
                  <input value={prefsInput} onChange={e => setPrefsInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key !== "Enter" || !prefsInput.trim()) return;
                      const val = prefsInput.trim();
                      const newHist = prefsHistory.includes(val) ? prefsHistory : [val, ...prefsHistory].slice(0, 20);
                      const newActive = activePrefs.includes(val) ? activePrefs : [...activePrefs, val];
                      setPrefsHistory(newHist); setActivePrefs(newActive); setPrefsInput("");
                      persist(weeks, archive, newHist, newActive);
                    }}
                    placeholder="es. senza glutine, vegetariano, no pesce… (Invio per aggiungere)"
                    style={{ flex:1, padding:"8px 12px", borderRadius:8, border:"1.5px solid #C8BBA8", background:"#FDFAF5", fontSize:13, color:"#2C2C2C", fontFamily:"Georgia,serif", outline:"none" }} />
                  <button onClick={() => {
                    const val = prefsInput.trim(); if (!val) return;
                    const newHist = prefsHistory.includes(val) ? prefsHistory : [val, ...prefsHistory].slice(0, 20);
                    const newActive = activePrefs.includes(val) ? activePrefs : [...activePrefs, val];
                    setPrefsHistory(newHist); setActivePrefs(newActive); setPrefsInput("");
                    persist(weeks, archive, newHist, newActive);
                  }} style={{ padding:"8px 14px", borderRadius:8, border:"none", background:"#2C2C2C", color:"#fff", fontSize:12, cursor:"pointer", fontFamily:"Georgia,serif" }}>+ Aggiungi</button>
                </div>

                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:14 }}>
                  {prefsHistory.length > 0 && (
                    <button onClick={() => {
                      if (window.confirm("Cancellare tutto lo storico?")) {
                        setPrefsHistory([]); setActivePrefs([]);
                        persist(weeks, archive, [], []);
                      }
                    }} style={{ fontSize:11, color:"#C47A7A", background:"transparent", border:"none", cursor:"pointer", padding:0 }}>🗑 Cancella storico</button>
                  )}
                  <button onClick={() => setShowPrefs(false)} style={{ padding:"7px 18px", borderRadius:20, border:"none", background:"#D4A96A", color:"#fff", fontSize:12, cursor:"pointer", fontFamily:"Georgia,serif", marginLeft:"auto" }}>Chiudi</button>
                </div>
              </div>
            )}

            {!hasData ? (
              <div style={{ background:"#fff", borderRadius:18, padding:"36px 24px", textAlign:"center", border:"1.5px solid #EDE6D6" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🥗</div>
                <p style={{ color:"#6B5D4F", fontSize:14, marginBottom:20 }}>Nessun piano per {wLabel(activeTab).toLowerCase()}.</p>
                <button onClick={() => generateWeek(activeTab)} style={{ padding:"11px 28px", borderRadius:40, border:"none", background:"#2C2C2C", color:"#fff", fontSize:14, cursor:"pointer", fontFamily:"Georgia,serif" }}>✨ Genera il piano</button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                {DAYS.map(day => {
                  const meal = plan[day];
                  return (
                    <div key={day} style={{ display:"flex", alignItems:"center", gap:12, background:"#fff", borderRadius:14, padding:"12px 14px", boxShadow:"0 2px 10px rgba(0,0,0,.05)", border:"1.5px solid #EDE6D6" }}>
                      <div style={{ width:68, flexShrink:0 }}>
                        <div style={{ fontSize:9, letterSpacing:2, color:"#9A8A72", textTransform:"uppercase" }}>{day.slice(0,3)}</div>
                        <div style={{ fontSize:15, fontWeight:600, color:"#2C2C2C" }}>{day.slice(3)||day}</div>
                      </div>
                      {meal ? (
                        <div style={{ flex:1, display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:48, height:48, borderRadius:10, flexShrink:0, overflow:"hidden", position:"relative" }}>
                            <MealImage query={meal.imageQuery} name={meal.name} color={meal.color} emoji={meal.emoji} style={{ width:48, height:48 }} />
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:"#2C2C2C", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:2 }}>{meal.name}</div>
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                              <span style={{ fontSize:10, color:"#9A8A72" }}>⏱{meal.prep}min</span>
                              <span style={{ fontSize:10, color:"#9A8A72" }}>🔥{meal.kcal*(meal.servings||1)}kcal</span>
                              {meal.tags?.slice(0,1).map(t=><span key={t} style={{ fontSize:9, padding:"1px 6px", borderRadius:20, background:meal.color+"22", color:meal.color }}>{t}</span>)}
                            </div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:3, background:"#F5F0E8", borderRadius:20, padding:"2px 6px", flexShrink:0 }}>
                            <button onClick={() => setServings(activeTab, day, (meal.servings||1)-1)} disabled={locked} style={{ width:20, height:20, borderRadius:"50%", border:"none", background:locked?"transparent":"#E8E0D0", color:"#6B5D4F", cursor:locked?"default":"pointer", fontSize:13, padding:0, lineHeight:1 }}>−</button>
                            <span style={{ fontSize:11, color:"#2C2C2C", minWidth:14, textAlign:"center" }}>{meal.servings||1}</span>
                            <button onClick={() => setServings(activeTab, day, (meal.servings||1)+1)} disabled={locked} style={{ width:20, height:20, borderRadius:"50%", border:"none", background:locked?"transparent":"#E8E0D0", color:"#6B5D4F", cursor:locked?"default":"pointer", fontSize:13, padding:0, lineHeight:1 }}>+</button>
                          </div>
                          <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                            <button onClick={() => { setShowRecipe(meal); setView("ricette"); }} style={{ padding:"4px 9px", borderRadius:20, border:"1.5px solid #C8BBA8", background:"transparent", color:"#6B5D4F", fontSize:11, cursor:"pointer" }}>Ricetta</button>
                            {!locked && <button onClick={() => swapMeal(activeTab, day)} style={{ padding:"4px 8px", borderRadius:20, border:"1.5px solid #A8C4B8", background:"transparent", color:"#5A8A70", fontSize:12, cursor:"pointer" }}>🔄</button>}
                            {!locked && <button onClick={() => { const np={...plan,[day]:null}; const key=weekKey(activeTab); const nw={...weeks,[key]:{...wd,plan:np}}; updateWeeks(nw,archive,prefsHistory,activePrefs); }} style={{ padding:"4px 8px", borderRadius:20, border:"1.5px solid #F0C4C4", background:"transparent", color:"#C47A7A", fontSize:11, cursor:"pointer" }}>✕</button>}
                          </div>
                        </div>
                      ) : (
                        <div style={{ flex:1, display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ flex:1, height:38, borderRadius:9, border:"1.5px dashed #C8BBA8", display:"flex", alignItems:"center", paddingLeft:12, color:"#B0A090", fontSize:12 }}>Nessun pasto assegnato</div>
                          {!locked && (
                            <button onClick={async () => {
                              const currentNames = DAYS.map(d => plan[d]?.name).filter(Boolean).join(", ");
                              setLoading(true); setLoadingMsg("Genero una ricetta per " + day + "...");
                              try {
                                const parsed = await callClaudeAPI("Genera UNA ricetta per pranzo da preparare in anticipo, diversa da: " + (currentNames || "nessuna") + "." + (activePrefs.length > 0 ? " Preferenze: " + activePrefs.join(", ") : "") + " Rispondi con array JSON di 1 elemento.");
                                const meal = assignVisuals([parsed[0]])[0];
                                const newMeals = [...(wd.meals || []), meal];
                                const newPlan = { ...plan, [day]: { ...meal, servings: 1 } };
                                const key = weekKey(activeTab);
                                const nw = { ...weeks, [key]: { ...wd, plan: newPlan, meals: newMeals } };
                                updateWeeks(nw, archive, prefsHistory, activePrefs);
                                notify("✨ Ricetta generata per " + day + "!");
                              } catch {
                                const fb = assignVisuals([FALLBACK_MEALS[Math.floor(Math.random() * FALLBACK_MEALS.length)]])[0];
                                const newPlan = { ...plan, [day]: { ...fb, servings: 1 } };
                                const key = weekKey(activeTab);
                                const nw = { ...weeks, [key]: { ...wd, plan: newPlan } };
                                updateWeeks(nw, archive, prefsHistory, activePrefs);
                                notify("📋 Ricetta di esempio inserita per " + day);
                              }
                              setLoading(false); setLoadingMsg("");
                            }} style={{ padding:"5px 12px", borderRadius:20, border:"none", background:"#D4A96A", color:"#fff", fontSize:11, cursor:"pointer", fontFamily:"Georgia,serif", whiteSpace:"nowrap", boxShadow:"0 2px 6px rgba(212,169,106,.35)" }}>
                              ✨ Genera
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── RICETTE ── */}
        {view === "ricette" && (
          <div>
            {showRecipe ? (
              <div>
                <button onClick={() => setShowRecipe(null)} style={{ marginBottom:14, padding:"6px 14px", borderRadius:20, border:"1.5px solid #C8BBA8", background:"transparent", color:"#6B5D4F", fontSize:12, cursor:"pointer" }}>← Tutte le ricette</button>
                <div style={{ background:"#fff", borderRadius:18, overflow:"hidden", border:"1.5px solid #EDE6D6", boxShadow:"0 4px 20px rgba(0,0,0,.06)" }}>
                  {/* Foto del piatto */}
                  <div style={{ position:"relative", height:200, overflow:"hidden" }}>
                    <MealImage query={showRecipe.imageQuery} name={showRecipe.name} style={{ width:"100%", height:"100%" }} />
                    <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)" }} />
                    <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"16px 20px" }}>
                      <div style={{ fontSize:28, marginBottom:4 }}>{showRecipe.emoji}</div>
                      <h2 style={{ margin:"0 0 4px", fontSize:19, fontWeight:600, color:"#fff", textShadow:"0 1px 4px rgba(0,0,0,.4)" }}>{showRecipe.name}</h2>
                      <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                        <span style={{ fontSize:12, color:"rgba(255,255,255,.85)" }}>⏱ {showRecipe.prep} min</span>
                        <span style={{ fontSize:12, color:"rgba(255,255,255,.85)" }}>🔥 {showRecipe.kcal} kcal/porzione</span>
                      </div>
                    </div>
                  </div>
                  {/* Link ricetta e video */}
                  {(showRecipe.recipeUrl || showRecipe.videoQuery) && (
                    <div style={{ display:"flex", gap:8, padding:"12px 20px", borderBottom:"1.5px solid #EDE6D6", flexWrap:"wrap" }}>
                      {showRecipe.recipeUrl && (
                        <a href={showRecipe.recipeUrl} target="_blank" rel="noreferrer"
                          style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:20, background:"#FFF8EC", border:"1.5px solid #EDD4A0", color:"#8A6A2A", fontSize:12, textDecoration:"none", fontFamily:"Georgia,serif" }}>
                          📖 Ricetta originale
                        </a>
                      )}
                      {showRecipe.videoQuery && (
                        <a href={"https://www.youtube.com/results?search_query="+encodeURIComponent(showRecipe.videoQuery)} target="_blank" rel="noreferrer"
                          style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:20, background:"#FFF0F0", border:"1.5px solid #F0C4C4", color:"#C47A7A", fontSize:12, textDecoration:"none", fontFamily:"Georgia,serif" }}>
                          ▶️ Video preparazione
                        </a>
                      )}
                    </div>
                  )}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
                    <div style={{ padding:"18px 20px", borderRight:"1.5px solid #EDE6D6" }}>
                      <h3 style={{ fontSize:10, letterSpacing:3, color:"#9A8A72", textTransform:"uppercase", marginBottom:10, marginTop:0 }}>Ingredienti (1 porzione)</h3>
                      {(showRecipe.ingredients||[]).map((ing,i)=><div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #F0EBE0", fontSize:12, color:"#2C2C2C" }}><span>{ing.name}</span><span style={{color:"#9A8A72"}}>{ing.qty} {ing.unit}</span></div>)}
                    </div>
                    <div style={{ padding:"18px 20px" }}>
                      <h3 style={{ fontSize:10, letterSpacing:3, color:"#9A8A72", textTransform:"uppercase", marginBottom:10, marginTop:0 }}>Procedimento</h3>
                      {(showRecipe.steps||[]).map((step,i)=><div key={i} style={{ display:"flex", gap:10, marginBottom:10 }}><div style={{ width:19, height:19, borderRadius:"50%", flexShrink:0, background:showRecipe.color+"33", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:showRecipe.color }}>{i+1}</div><p style={{ margin:0, fontSize:12, color:"#4A4035", lineHeight:1.6 }}>{step}</p></div>)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color:"#6B5D4F", fontSize:12, marginTop:0 }}>{(wd.meals||[]).length} ricette · {wLabel(activeTab)}</p>
                {!(wd.meals||[]).length ? <div style={{ background:"#fff", borderRadius:14, padding:"28px", textAlign:"center", border:"1.5px solid #EDE6D6", color:"#9A8A72" }}>Genera prima un piano nel Planner.</div> : (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
                    {(wd.meals||[]).map(meal=>(
                      <div key={meal.id} onClick={()=>setShowRecipe(meal)} style={{ background:"#fff", borderRadius:14, overflow:"hidden", cursor:"pointer", border:"1.5px solid #EDE6D6", transition:"all .18s", boxShadow:"0 2px 8px rgba(0,0,0,.04)" }}
                        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,.1)"}}
                        onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,.04)"}}>
                        {/* Foto thumbnail */}
                        <div style={{ position:"relative", height:120, overflow:"hidden" }}>
                          <MealImage query={meal.imageQuery} name={meal.name} style={{ width:"100%", height:"100%" }} />
                          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 50%)" }} />
                          <div style={{ position:"absolute", bottom:6, left:10, fontSize:18 }}>{meal.emoji}</div>
                          {(meal.recipeUrl || meal.videoQuery) && (
                            <div style={{ position:"absolute", top:6, right:6, display:"flex", gap:4 }}>
                              {meal.recipeUrl && <span style={{ fontSize:11, background:"rgba(255,255,255,.85)", borderRadius:10, padding:"2px 6px" }}>📖</span>}
                              {meal.videoQuery && <span style={{ fontSize:11, background:"rgba(255,255,255,.85)", borderRadius:10, padding:"2px 6px" }}>▶️</span>}
                            </div>
                          )}
                        </div>
                        <div style={{ padding:"10px 12px 8px" }}>
                          <h3 style={{ margin:"0 0 4px", fontSize:12, fontWeight:600, color:"#2C2C2C" }}>{meal.name}</h3>
                          <div style={{ display:"flex", gap:8, marginBottom:6 }}>
                            <span style={{ fontSize:10, color:"#9A8A72" }}>⏱{meal.prep}min</span>
                            <span style={{ fontSize:10, color:"#9A8A72" }}>🔥{meal.kcal}kcal</span>
                          </div>
                          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                            {(meal.tags||[]).map(t=><span key={t} style={{ fontSize:9, padding:"1px 7px", borderRadius:20, background:meal.color+"18", color:meal.color }}>{t}</span>)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SPESA ── */}
        {view === "spesa" && (
          <div>
            {locked && <div style={{ background:"#E8F5EE", border:"1.5px solid #A8C4B4", borderRadius:10, padding:"9px 14px", fontSize:12, color:"#4A7A6A", marginBottom:12 }}>🔒 Lista bloccata — spunte e selezione fisse.</div>}
            {!plannedCount ? (
              <div style={{ background:"#fff", borderRadius:18, padding:"36px", textAlign:"center", border:"1.5px solid #EDE6D6" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🛒</div>
                <p style={{ color:"#6B5D4F" }}>Pianifica i pasti nel Planner.</p>
                <button onClick={()=>setView("planner")} style={{ padding:"9px 20px", borderRadius:40, border:"none", background:"#2C2C2C", color:"#fff", fontSize:13, cursor:"pointer", fontFamily:"Georgia,serif" }}>Vai al Planner</button>
              </div>
            ) : (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
                  <span style={{ color:"#6B5D4F", fontSize:12 }}>
                    <strong>{activeSl.length}/{sl.length} prodotti</strong> selezionati
                    {!locked && <span style={{color:"#9A8A72"}}> · clicca per deselezionare</span>}
                  </span>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {!locked && (
                      <>
                        <button onClick={() => setCheckedSl(Object.fromEntries(sl.map(i=>[i.name,true])))} style={{ padding:"5px 10px", borderRadius:20, border:"1.5px solid #C8BBA8", background:"transparent", color:"#6B5D4F", fontSize:11, cursor:"pointer" }}>✓ Tutti</button>
                        <button onClick={() => setCheckedSl(Object.fromEntries(sl.map(i=>[i.name,false])))} style={{ padding:"5px 10px", borderRadius:20, border:"1.5px solid #C8BBA8", background:"transparent", color:"#6B5D4F", fontSize:11, cursor:"pointer" }}>✗ Nessuno</button>
                      </>
                    )}
                    <button onClick={() => {
                      const t = "🛒 Lista spesa — "+wLabel(activeTab)+"\n\n"+activeSl.map(i=>"• "+i.name+" — "+i.qty+" "+i.unit).join("\n");
                      navigator.clipboard.writeText(t).then(()=>notify("📋 Copiata ("+activeSl.length+" prodotti)!"));
                    }} style={{ padding:"6px 12px", borderRadius:20, border:"1.5px solid #C8BBA8", background:"transparent", color:"#6B5D4F", fontSize:12, cursor:"pointer" }}>📋 Copia lista</button>
                    <button onClick={() => {
                      const encoded = encodeURIComponent(JSON.stringify(activeSl));
                      const label = encodeURIComponent(wLabel(activeTab));
                      const apiUrl = window.location.origin+"/api/shopping-list?items="+encoded+"&weekLabel="+label;
                      window.open(apiUrl, "_blank");
                      notify("📤 Lista pronta per Chrome ("+activeSl.length+" prodotti)!");
                    }} style={{ padding:"6px 12px", borderRadius:20, border:"1.5px solid #A8C4B8", background:"transparent", color:"#4A7A6A", fontSize:12, cursor:"pointer" }}>📤 Invia a Chrome</button>
                  </div>
                </div>

                {(() => {
                  // Categorize items by keyword
                  const CATS = [
                    { label:"🥩 Carne e Pesce",    color:"#C4855A", keys:["pollo","carne","tonno","salmone","merluzzo","tacchino","manzo","maiale","gamberett","pesce","prosciutto","pancetta","speck"] },
                    { label:"🥦 Verdure",           color:"#7BAF8E", keys:["zucchine","pomodor","insalata","spinaci","rucola","carote","carota","peperone","cetriolo","cipolla","aglio","broccoli","funghi","melanzane","sedano","finocchio","verdur","lattuga"] },
                    { label:"🌾 Cereali e Legumi",  color:"#D4A96A", keys:["farro","riso","quinoa","pasta","lenticchie","ceci","fagioli","avena","orzo","farina","pane","tortilla","edamame","mais","couscous"] },
                    { label:"🧀 Latticini e Uova",  color:"#8FA656", keys:["feta","parmigiano","mozzarella","yogurt","latte","burro","uova","uovo","formaggio","ricotta","panna"] },
                    { label:"🫙 Condimenti e Altro",color:"#9A8A72", keys:[] },
                  ];
                  function getCategory(name) {
                    const n = name.toLowerCase();
                    for (const cat of CATS.slice(0,-1)) {
                      if (cat.keys.some(k => n.includes(k))) return cat.label;
                    }
                    return CATS[CATS.length-1].label;
                  }
                  // Group items by category
                  const grouped = {};
                  sl.forEach(item => {
                    const cat = getCategory(item.name);
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(item);
                  });
                  const catOrder = CATS.map(c => c.label).filter(l => grouped[l]);
                  return catOrder.map(catLabel => {
                    const catColor = CATS.find(c => c.label === catLabel)?.color || "#9A8A72";
                    const items = grouped[catLabel];
                    return (
                      <div key={catLabel} style={{ marginBottom:10 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:catColor, letterSpacing:1, textTransform:"uppercase", padding:"8px 16px 6px", background:"#fff", borderRadius:"12px 12px 0 0", borderBottom:"1.5px solid #EDE6D6", border:"1.5px solid #EDE6D6" }}>
                          {catLabel} <span style={{color:"#B0A090",fontWeight:400}}>({items.filter(i=>checkedSl[i.name]!==false).length}/{items.length})</span>
                        </div>
                        <div style={{ background:"#fff", borderRadius:"0 0 12px 12px", border:"1.5px solid #EDE6D6", borderTop:"none", overflow:"hidden" }}>
                          {items.map((item, i) => {
                            const checked = checkedSl[item.name] !== false;
                            return (
                              <div key={item.name}
                                onClick={() => { if (!locked) setCheckedSl(prev => ({...prev, [item.name]: !checked})); }}
                                style={{ display:"flex", alignItems:"center", padding:"10px 14px", borderBottom:i<items.length-1?"1px solid #F0EBE0":"none", fontSize:13, gap:10, cursor:locked?"default":"pointer", background:checked?"#fff":"#F8F6F2", transition:"background .15s" }}>
                                <div style={{ width:19, height:19, borderRadius:5, flexShrink:0, border:checked?"none":"1.5px solid #C8BBA8", background:checked?"#7BAF8E":"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}>
                                  {checked && <svg width="10" height="8" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                                <span style={{ flex:1, color:checked?"#2C2C2C":"#B0A090", textDecoration:checked?"none":"line-through", transition:"all .15s" }}>{item.name}</span>
                                <span style={{ color:"#9A8A72", fontStyle:"italic", flexShrink:0, fontSize:12 }}>{item.qty} {item.unit}</span>
                                {checked && (
                                  <a href={"https://www.amazon.it/s?k="+encodeURIComponent(item.name)+"&i=amazonfresh"} target="_blank" rel="noreferrer"
                                    onClick={e=>e.stopPropagation()}
                                    title={"Cerca su Amazon Fresh: "+item.name}
                                    style={{ flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", width:24, height:24, borderRadius:6, background:"#FFF3E0", border:"1.5px solid #FFD180", textDecoration:"none", fontSize:12 }}>
                                    🛒
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}


                <div style={{ marginTop:12, padding:"11px 14px", background:"#EDF5F0", borderRadius:10, fontSize:12, color:"#5A8A6E" }}>💡 <strong>Tip:</strong> Cuoci cereali e legumi la domenica sera — si conservano 4-5 giorni in frigo.</div>
              </div>
            )}
          </div>
        )}

        {/* ── ARCHIVIO ── */}
        {view === "archivio" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
              <span style={{ color:"#6B5D4F", fontSize:12 }}>{archive.length} settimane · ❤️ per insegnare i tuoi gusti all'AI</span>
              <button onClick={() => archiveWeek("current")} style={{ padding:"6px 13px", borderRadius:20, border:"1.5px solid #C8BBA8", background:"transparent", color:"#6B5D4F", fontSize:12, cursor:"pointer" }}>+ Archivia sett. corrente</button>
            </div>

            {!archive.length ? (
              <div style={{ background:"#fff", borderRadius:14, padding:"28px", textAlign:"center", border:"1.5px solid #EDE6D6", color:"#9A8A72", fontSize:13 }}>Nessuna settimana archiviata ancora.</div>
            ) : archiveDetail ? (() => {
              const aw = archive.find(a => a.weekKey === archiveDetail);
              if (!aw) return null;
              return (
                <div>
                  <button onClick={()=>setArchiveDetail(null)} style={{ marginBottom:14, padding:"6px 14px", borderRadius:20, border:"1.5px solid #C8BBA8", background:"transparent", color:"#6B5D4F", fontSize:12, cursor:"pointer" }}>← Archivio</button>
                  <div style={{ fontSize:12, color:"#9A8A72", marginBottom:12 }}>Settimana {aw.weekKey} · ❤️ clicca il cuore sulle ricette preferite</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {DAYS.map(day => {
                      const meal = aw.plan[day]; if (!meal) return null;
                      const liked = (aw.likedIds||[]).includes(meal.id);
                      return (
                        <div key={day} style={{ display:"flex", alignItems:"center", gap:12, background:"#fff", borderRadius:12, padding:"11px 14px", border:"1.5px solid #EDE6D6" }}>
                          <div style={{ width:32, height:32, borderRadius:8, background:meal.color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{meal.emoji}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:"#2C2C2C", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{meal.name}</div>
                            <div style={{ fontSize:10, color:"#9A8A72" }}>{day} · {meal.kcal} kcal · {meal.prep}min</div>
                          </div>
                          <button onClick={() => toggleLike(aw.weekKey, meal.id)} style={{ fontSize:19, background:"transparent", border:"none", cursor:"pointer", padding:"3px 6px", borderRadius:8, transition:"transform .15s" }} onMouseEnter={e=>e.currentTarget.style.transform="scale(1.25)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                            {liked ? "❤️" : "🤍"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {(aw.likedIds||[]).length > 0 && <div style={{ marginTop:14, padding:"11px 14px", background:"#FFF8EC", borderRadius:10, border:"1.5px solid #EDE6D6", fontSize:12, color:"#6B5D4F" }}>❤️ <strong>{aw.likedIds.length}</strong> ricette preferite — l'AI ne terrà conto per i piani futuri.</div>}
                </div>
              );
            })() : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:12 }}>
                {archive.map(aw => (
                  <div key={aw.weekKey} onClick={()=>setArchiveDetail(aw.weekKey)} style={{ background:"#fff", borderRadius:14, padding:"16px", border:"1.5px solid #EDE6D6", cursor:"pointer", transition:"all .18s", boxShadow:"0 2px 8px rgba(0,0,0,.04)" }}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,.1)"}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,.04)"}}>
                    <div style={{ fontSize:10, letterSpacing:2, color:"#9A8A72", textTransform:"uppercase", marginBottom:4 }}>{aw.weekKey}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#2C2C2C", marginBottom:6 }}>{DAYS.filter(d=>aw.plan[d]).length} pasti pianificati</div>
                    <div style={{ display:"flex", gap:3, marginBottom:8 }}>{DAYS.map(d=>aw.plan[d]?<span key={d} style={{fontSize:15}}>{aw.plan[d].emoji}</span>:null)}</div>
                    <div style={{ fontSize:11, color:(aw.likedIds||[]).length>0?"#C4855A":"#B0A090" }}>{(aw.likedIds||[]).length>0?`❤️ ${aw.likedIds.length} preferite`:"Nessuna preferenza"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
      <style>{"button:focus{outline:none}*{box-sizing:border-box}"}</style>
    </div>
  );
}
