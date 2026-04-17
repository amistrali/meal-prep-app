async function callClaudeAPI(userMsg) {
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMsg }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }

  const data = await response.json();

  const text = (data.content || [])
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("");

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Nessun JSON trovato");

  return JSON.parse(match[0]);
}
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_KEY, // ⚠️ funziona SOLO server-side
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022", // modello stabile
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userMsg
        }
      ]
    })
  });

  // 🔴 1. Controllo errore API
  if (!response.ok) {
    const errText = await response.text();
    console.error("Errore API Claude:", errText);
    throw new Error(`Claude API error ${response.status}`);
  }

  const data = await response.json();

  // 🔴 2. Estrazione testo più robusta
  const textBlocks = (data.content || []).filter(b => b.type === "text");
  const text = textBlocks.map(b => b.text).join("").trim();

  if (!text) {
    console.error("Risposta vuota:", data);
    throw new Error("Risposta vuota da Claude");
  }

  // 🔴 3. Parsing JSON robusto
  let parsed;
  try {
    // tenta parsing diretto
    parsed = JSON.parse(text);
  } catch {
    // fallback: estrai array JSON
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      console.error("Testo non parsabile:", text);
      throw new Error("Nessun JSON valido trovato");
    }
    parsed = JSON.parse(match[0]);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Array non valido");
  }

  return parsed;
}