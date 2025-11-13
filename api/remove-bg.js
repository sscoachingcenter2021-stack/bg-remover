import formidable from "formidable";
import fs from "fs";
import FormData from "form-data";

export const config = {
  api: { bodyParser: false }, // Important for file uploads
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: "Form parsing failed" });

    // Get uploaded file
    const file = files.image_file;
    if (!file) return res.status(400).json({ error: "No image uploaded" });

    const filePath = Array.isArray(file) ? file[0].filepath : file.filepath;
    if (!filePath) return res.status(400).json({ error: "File path missing" });

    try {
      const buffer = fs.readFileSync(filePath);

      // Create form-data for Remove.bg API
      const fd = new FormData();
      fd.append("image_file", buffer, { filename: "image.png" });
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

      const resultBuffer = Buffer.from(await r.arrayBuffer());
      res.setHeader("Content-Type", "image/png");
      res.send(resultBuffer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });
}
