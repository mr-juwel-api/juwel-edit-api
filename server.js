const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const KEY = process.env.GEMINI_KEY;
const MODEL = "gemini-2.5-flash-image";

app.get("/", (req, res) => res.send("Juwel Edit API is running"));

app.post("/api/edit", async (req, res) => {
  try {
    if (!KEY) {
      return res.status(500).json({ error: "GEMINI_KEY is not set on the server" });
    }

    const { prompt, imageUrl } = req.body;
    if (!prompt || !imageUrl) {
      return res.status(400).json({ error: "prompt and imageUrl are required" });
    }

    const img = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const b64 = Buffer.from(img.data).toString("base64");
    const mime = img.headers["content-type"] || "image/jpeg";

    const r = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
      {
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mime, data: b64 } }
            ]
          }
        ]
      },
      { timeout: 100000 }
    );

    const parts = r.data?.candidates?.[0]?.content?.parts || [];
    const part = parts.find(p => p.inlineData || p.inline_data);

    if (!part) {
      const textPart = parts.find(p => p.text);
      const reason =
        textPart?.text ||
        r.data?.promptFeedback?.blockReason ||
        "No image returned by the model";
      return res.status(500).json({ error: reason });
    }

    const data = (part.inlineData || part.inline_data).data;
    res.set("Content-Type", "image/jpeg");
    res.send(Buffer.from(data, "base64"));
  } catch (e) {
    const detail = e.response?.data?.error?.message || e.message;
    console.error("Error:", detail);
    res.status(500).json({ error: detail });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});
