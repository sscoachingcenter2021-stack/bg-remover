import { IncomingForm } from "formidable";
import fs from "fs";
import FormData from "form-data";

export const config = { api: { bodyParser: false } };

const parseForm = (req) =>
  new Promise((resolve, reject) => {
    const form = new IncomingForm({ keepExtensions: true });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { files } = await parseForm(req);
    console.log("FILES:", files);

    // Get uploaded file
    const fileObj = files.image_file;
let filePath;

if (Array.isArray(fileObj)) filePath = fileObj[0]?.filepath;
else if (fileObj) filePath = fileObj.filepath;

if (!filePath) return res.status(400).json({ error: "No image uploaded" });

    if (!filePath) return res.status(400).json({ error: "No image uploaded" });

    // Read file as Buffer
const buffer = fs.readFileSync(filePath);
fd.append("image_file_b64", buffer.toString("base64"));

    // Send to remove.bg
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
}
