// /api/video — trova su YouTube un video DAVVERO pertinente alla ricetta.
//
// Strategia: una search.list per piatto (limitata all'italiano e ai video
// incorporabili), poi una videos.list sui candidati per avere durata, lingua
// e stato di embed. Ogni candidato riceve un punteggio di pertinenza; sotto
// soglia si restituisce null, perche' meglio nessun video che un video sbagliato.
//
// Costo quota: 100 unita' per search.list + 1 per videos.list => ~100 ricerche
// al giorno con la quota gratuita. La cache in memoria riduce le chiamate
// ripetute sullo stesso piatto finche' l'istanza resta calda.

const YT_SEARCH = "https://www.googleapis.com/youtube/v3/search";
const YT_VIDEOS = "https://www.googleapis.com/youtube/v3/videos";

const CACHE = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const CACHE_MAX = 400;

// ── NORMALIZZAZIONE ─────────────────────────────────────────────────────────
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Parole che non aiutano a capire di che piatto si tratta.
const STOPWORDS = new Set([
  "di","del","della","dello","dei","degli","delle","da","dal","dalla","con","e",
  "ed","il","lo","la","i","gli","le","un","uno","una","al","allo","alla","ai",
  "agli","alle","in","nel","nella","su","per","a","the","and","of","with",
  "ricetta","ricette","facile","veloce","come","fare","preparare","preparazione",
  "video","tutorial","perfetto","perfetta","buonissimo","buonissima","light",
  "fit","proteico","proteica","bowl","meal","prep","piatto","pranzo","cena",
  "gustoso","gustosa","semplice","originale","classico","classica","mia","mio"
]);

function contentTokens(s) {
  return norm(s).split(" ").filter(t => t.length > 2 && !STOPWORDS.has(t));
}

// Match tollerante sulle desinenze ("zucchine" aggancia "zucchina") ma non
// fra parole di lunghezza troppo diversa: "zucca" NON deve agganciare "zucchine".
function tokenMatches(token, haystackTokens) {
  const stem = w => w.slice(0, Math.max(4, w.length - 2));
  const st = stem(token);
  return haystackTokens.some(h => {
    if (h === token) return true;
    if (Math.abs(h.length - token.length) > 2) return false;
    return h.startsWith(st) || token.startsWith(stem(h));
  });
}

// ── INGREDIENTI CARATTERIZZANTI ─────────────────────────────────────────────
// Se il piatto e' al salmone e il video parla di pollo, non e' lo stesso piatto.
// Basi neutre: da sole non identificano il piatto (mille "pasta al forno" diverse).
const BASE_INGREDIENTS = [
  "pasta","riso","farro","orzo","quinoa","couscous","bulgur","polenta","gnocchi",
  "patate","pane","piadina","tortilla","cereali","insalata"
];

// Ingredienti caratterizzanti: sono questi a dire se il video e' lo stesso piatto.
const KEY_INGREDIENTS = [
  "pollo","tacchino","manzo","vitello","maiale","agnello","salsiccia","prosciutto",
  "salmone","tonno","merluzzo","baccala","branzino","orata","gamberi","gamberetti",
  "polpo","calamari","cozze","vongole","seppie","acciughe","sgombro",
  "uova","frittata","tofu","tempeh","seitan","ceci","lenticchie","fagioli","piselli",
  "melanzane","zucchine","zucca","broccoli","cavolfiore","spinaci","funghi",
  "peperoni","carciofi","asparagi","radicchio","finocchi","cavolo","verza",
  "ricotta","mozzarella","feta","parmigiano","burrata","stracchino","gorgonzola",
  "pesto","hummus","curry","ragu","besciamella"
];

const ALL_INGREDIENTS = [...BASE_INGREDIENTS, ...KEY_INGREDIENTS];

function ingredientsOf(dish) {
  const hay = norm(dish.name) + " " + (dish.ingredients || []).map(i => norm(i.name)).join(" ");
  const hayTokens = hay.split(" ");
  return {
    key: KEY_INGREDIENTS.filter(ing => tokenMatches(ing, hayTokens)),
    all: ALL_INGREDIENTS.filter(ing => tokenMatches(ing, hayTokens))
  };
}

// ── CANALI ITALIANI DI CUCINA ───────────────────────────────────────────────
const TRUSTED_CHANNELS = [
  "giallozafferano","fatto in casa da benedetta","benedetta rossi","cucchiaio",
  "misya","ricette della nonna","casa pappagallo","luca pappagallo",
  "sonia peronaci","cotto e mangiato","la cucina italiana","chef stefano barbato",
  "cucina botanica","fatto in casa","le ricette di","chef max mariola",
  "gennaro contaldo","peppe guida","alessandro borghese","ruben bondi",
  "cucinare e","in cucina con","ricette di casa","cucina con","chef in camicia"
];

// Marcatori che indicano che il titolo e' in italiano.
const IT_MARKERS = [
  "ricetta","ricette","con","alla","al","di","della","del","come","fare",
  "preparare","veloce","facile","cucina","primo","secondo","forno","padella",
  "cremosa","cremoso","gustosa","buonissima","perfetta","senza","fatto","casa"
];

function isItalianTitle(title) {
  const t = norm(title).split(" ");
  return IT_MARKERS.some(m => t.includes(m));
}

function parseDuration(iso) {
  const m = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || "");
  if (!m) return 0;
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
}

// ── PUNTEGGIO DI PERTINENZA ─────────────────────────────────────────────────
function scoreVideo(dish, video, dishIng) {
  const titleTokens = norm(video.title).split(" ");
  const dishTokens = contentTokens(dish.name);
  const channel = norm(video.channel);

  // 1. Quanta parte del nome del piatto compare nel titolo del video.
  const matched = dishTokens.filter(t => tokenMatches(t, titleTokens));
  const coverage = dishTokens.length ? matched.length / dishTokens.length : 0;
  if (coverage < 0.34) return { score: 0, coverage };

  let score = coverage * 55;

  // 2. Ingredienti caratterizzanti. Il titolo che azzecca la base ("pasta al
  //    forno") ma sbaglia il ripieno non e' lo stesso piatto: e' qui che si
  //    giocava la maggior parte dell'impertinenza.
  const videoKey = KEY_INGREDIENTS.filter(ing => tokenMatches(ing, titleTokens));
  const shared = dishIng.key.filter(m => videoKey.includes(m));
  const conflicting = videoKey.filter(m => !dishIng.all.includes(m));

  if (shared.length > 0) score += 18 + Math.min(2, shared.length - 1) * 5;
  // Se il titolo ricalca per intero il nome del piatto, il nome basta come prova.
  else if (dishIng.key.length > 0 && coverage < 0.8) score -= 35;

  if (conflicting.length > 0) score -= 35;

  // 3. E' un video di preparazione, non una vetrina.
  const titleN = norm(video.title);
  if (/\b(ricetta|ricette|come fare|come preparare|preparazione|passo passo)\b/.test(titleN)) score += 8;

  // 3b. Video legati a un elettrodomestico specifico: utili solo a chi ce l'ha.
  //     Penalizzati quanto basta per farsi superare da un'alternativa generica,
  //     non tanto da sparire se sono l'unica cosa pertinente.
  const appliance = /\b(bimby|thermomix|tm5|tm6|tm31|tm21|monsieur cuisine|cuisine companion|friggitrice ad aria|airfryer)\b/;
  if (appliance.test(titleN) && !appliance.test(norm(dish.name))) score -= 18;

  // 4. Canale affidabile di cucina italiana.
  if (TRUSTED_CHANNELS.some(c => channel.includes(c))) score += 12;

  // 5. Lingua: il campo dichiarato vale piu' dell'euristica sul titolo.
  const lang = (video.lang || "").toLowerCase();
  if (lang.startsWith("it")) score += 12;
  else if (lang && !lang.startsWith("it")) score -= 30;
  else if (isItalianTitle(video.title)) score += 8;
  else score -= 15;

  // 6. Durata: gli Short non spiegano una preparazione.
  const d = video.durationSec;
  if (d > 0 && d < 75) score -= 25;
  else if (d >= 120 && d <= 1200) score += 6;
  else if (d > 2700) score -= 8;

  return { score: Math.round(score), coverage };
}

// ── QUERY ───────────────────────────────────────────────────────────────────
function buildQueries(dish, effort) {
  const cleanName = contentTokens(dish.name).join(" ");
  const queries = [cleanName + " ricetta"];
  if (effort >= 2 && dish.videoQuery) queries.push(String(dish.videoQuery).slice(0, 90));
  if (effort >= 3) {
    const mains = ingredientsOf(dish).key.slice(0, 2).join(" ");
    if (mains) queries.push(mains + " ricetta come preparare");
  }
  return [...new Set(queries.filter(Boolean))];
}

// ── CHIAMATE YOUTUBE ────────────────────────────────────────────────────────
async function ytSearch(key, query) {
  const url = `${YT_SEARCH}?part=snippet&type=video&videoEmbeddable=true&maxResults=20` +
    `&relevanceLanguage=it&regionCode=IT&safeSearch=strict&q=${encodeURIComponent(query)}&key=${key}`;
  const r = await fetch(url);
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    const err = new Error(`youtube search ${r.status}`);
    err.detail = body.slice(0, 300);
    err.status = r.status;
    throw err;
  }
  const data = await r.json();
  return (data.items || []).map(it => ({
    id: it.id?.videoId,
    title: it.snippet?.title || "",
    channel: it.snippet?.channelTitle || "",
    thumb: it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url || ""
  })).filter(v => v.id);
}

async function ytDetails(key, ids) {
  if (ids.length === 0) return {};
  const url = `${YT_VIDEOS}?part=contentDetails,status,snippet&id=${ids.join(",")}&key=${key}`;
  const r = await fetch(url);
  if (!r.ok) return {};
  const data = await r.json();
  const out = {};
  for (const it of data.items || []) {
    out[it.id] = {
      durationSec: parseDuration(it.contentDetails?.duration),
      embeddable: it.status?.embeddable !== false,
      lang: it.snippet?.defaultAudioLanguage || it.snippet?.defaultLanguage || "",
      live: it.snippet?.liveBroadcastContent && it.snippet.liveBroadcastContent !== "none"
    };
  }
  return out;
}

// Soglia di accettazione: sale con l'insistenza? No — resta ferma.
// La priorita' alta amplia la RICERCA, non abbassa la qualita' richiesta.
const MIN_SCORE = 52;

async function resolveDish(key, dish, effort) {
  const cacheKey = norm(dish.name) + "|" + effort;
  const hit = CACHE.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const dishIng = ingredientsOf(dish);
  let best = null;

  let queriesUsed = 0;
  for (const q of buildQueries(dish, effort)) {
    queriesUsed++;
    let candidates;
    try {
      candidates = await ytSearch(key, q);
    } catch (e) {
      if (e.status === 403) throw e; // quota finita o chiave non valida: inutile insistere
      continue;
    }
    if (candidates.length === 0) continue;

    const details = await ytDetails(key, candidates.map(c => c.id).slice(0, 50));
    for (const c of candidates) {
      const d = details[c.id] || {};
      if (d.embeddable === false || d.live) continue;
      const enriched = { ...c, durationSec: d.durationSec || 0, lang: d.lang || "" };
      const { score } = scoreVideo(dish, enriched, dishIng);
      if (!best || score > best.score) best = { ...enriched, score };
    }
    // Risparmio di quota: se il match e' gia' ottimo ci fermiamo subito, e in
    // ogni caso non spendiamo una terza ricerca quando ne abbiamo gia' uno valido.
    if (best && best.score >= 70) break;
    if (best && best.score >= MIN_SCORE && queriesUsed >= 2) break;
  }

  const value = best && best.score >= MIN_SCORE
    ? {
        id: best.id,
        title: best.title,
        channel: best.channel,
        thumb: best.thumb,
        durationSec: best.durationSec,
        score: best.score,
        url: "https://www.youtube.com/watch?v=" + best.id
      }
    : null;

  if (CACHE.size > CACHE_MAX) CACHE.clear();
  CACHE.set(cacheKey, { at: Date.now(), value });
  return value;
}

// ── HANDLER ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return res.status(200).json({ results: {}, warning: "missing_key" });
  }

  const dishes = Array.isArray(req.body?.dishes) ? req.body.dishes.slice(0, 20) : [];
  const effort = Math.min(3, Math.max(1, Number(req.body?.effort) || 1));
  if (dishes.length === 0) return res.status(200).json({ results: {} });

  const results = {};
  let quotaError = null;

  // In parallelo ma a piccoli gruppi, per non aprire 20 connessioni insieme.
  const CHUNK = 5;
  for (let i = 0; i < dishes.length; i += CHUNK) {
    const chunk = dishes.slice(i, i + CHUNK);
    const settled = await Promise.all(chunk.map(async d => {
      const dishKey = d.key ?? d.name;
      try {
        return [dishKey, await resolveDish(key, d, effort)];
      } catch (e) {
        if (e.status === 403) quotaError = e.detail || "quota";
        return [dishKey, null];
      }
    }));
    settled.forEach(([k, v]) => { results[k] = v; });
    if (quotaError) break;
  }

  return res.status(200).json(quotaError ? { results, warning: "quota", detail: quotaError } : { results });
}
