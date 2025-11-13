// api/remove-bg.js
import formidable from "formidable";
import fs from "fs";
import FormData from "form-data";   // 👈 Node-compatible FormData

export const config = {
  api: { bodyParser: false },       // let formidable handle multipart form
};

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    // Parse uploaded image file
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    const file = files.image_file?.[0];
    if (!file) return res.status(400).json({ error: "No image uploaded" });

    // Create Node FormData and attach the image stream
    const fd = new FormData();
    fd.append("image_file", fs.createReadStream(file.filepath)); // ✅ stream ok here
    fd.append("size", "auto");

    // Send to remove.bg API
    const r = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.REMOVEBG_API_KEY,
        ...fd.getHeaders(), // 👈 adds correct multipart boundaries
      },
      body: fd,
    });

    if (!r.ok) {
      const msg = await r.text();
      return res.status(r.status).send(msg);
    }

    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", "image/png");
    res.send(buf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
