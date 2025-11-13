// api/remove-bg.js

import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // important — we'll handle file parsing ourselves
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse multipart form data (image file)
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const file = files.image_file?.[0];
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileStream = fs.createReadStream(file.filepath);
    const formData = new FormData();
    formData.append("image_file", fileStream, file.originalFilename || "image.png");
    formData.append("size", "auto");

    // Call remove.bg API
    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.REMOVEBG_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).send(errText);
    }

    const arrayBuffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "image/png");
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
