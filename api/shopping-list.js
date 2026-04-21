// File da copiare in: meal-prep-app/api/shopping-list.js
// Questo endpoint legge la lista spesa dal localStorage dell'app
// e la espone all'estensione Chrome tramite CORS

export default function handler(req, res) {
  // Permetti richieste dall'estensione Chrome
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "GET") { res.status(405).end(); return; }

  // Questo endpoint riceve i dati via query string
  // L'app li invia quando l'utente clicca "Invia a Chrome"
  const { items, weekLabel } = req.query;

  if (!items) {
    return res.status(200).json({ items: [], weekLabel: "" });
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(items));
    res.status(200).json({ items: parsed, weekLabel: weekLabel || "" });
  } catch {
    res.status(400).json({ error: "Formato non valido" });
  }
}
