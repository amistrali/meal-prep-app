export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { message } = req.body;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: "Missing API key" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        messages: [{ role: "user", content: message }],
        max_tokens: 1000,
        system: `Sei un nutrizionista esperto ...` // stesso SYSTEM_PROMPT di prima
      })
    });
    const data = await response.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    const match = text.match(/\[[\s\S]*\]/);
    const parsed = match ? JSON.parse(match[0]) : [];
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}