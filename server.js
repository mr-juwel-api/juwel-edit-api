const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const KEY = process.env.GEMINI_KEY;
const MODEL = "gemini-2.5-flash-image";

app.get("/", (req, res) => res.send("Juwel Edit API is running"));

app.post("/api/edit", async (req, res) => {
  try {
    const { prompt, imageUrl } = req.body;
    const img = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const b64 = Buffer.from(img.data).toString("base64");

    const r = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`,
      {
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: "image/jpeg", data: b64 } }
        ]}]
      }
    );

    const part = r.data.candidates[0].content.parts.find(p => p.inlineData || p.inline_data);
    const data = (part.inlineData || part.inline_data).data;
    res.set("Content-Type", "image/jpeg");
    res.send(Buffer.from(data, "base64"));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(process.env.PORT || 3000);
