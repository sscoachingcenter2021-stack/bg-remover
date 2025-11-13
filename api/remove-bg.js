import formidable from "formidable";
import fs from "fs";
import FormData from "form-data";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Parse multipart form
  const form = formidable({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Form parsing error" });
    }

    const file = files.image_file;
    if (!file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    // Get path safely
    const filePath = Array.isArray(file) ? file[0].filepath : file.filepath;

    if (!filePath) return res.status(400).json({ error: "No image uploaded" });

    try {
      const buffer = fs.readFileSync(filePath);

      // Prepare FormData for remove.bg
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
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
}
