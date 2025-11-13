// api/remove-bg.js
import { IncomingForm } from "formidable";
import fs from "fs";
import FormData from "form-data";

export const config = {
  api: {
    bodyParser: false, // disable Next.js body parsing
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const form = new IncomingForm();
    form.keepExtensions = true;

    form.parse(req, async (err, fields, files) => {
      if (err) return res.status(500).json({ error: err.message });

      const file = files.image_file;
      if (!file) return res.status(400).json({ error: "No image uploaded" });

      // Node FormData for Remove.bg
      const fd = new FormData();
      fd.append("image_file", fs.createReadStream(file.filepath));
      fd.append("size", "auto");

      const r = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: {
          "X-Api-Key": process.env.REMOVEBG_API_KEY,
          ...fd.getHeaders(),
        },
        body: fd,
      });

      if (!r.ok) {
        const text = await r.text();
        return res.status(r.status).send(text);
      }

      const buffer = Buffer.from(await r.arrayBuffer());
      res.setHeader("Content-Type", "image/png");
      res.send(buffer);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
