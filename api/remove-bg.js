import formidable from "formidable";
import FormData from "form-data";

export const config = { api: { bodyParser: false } };

// Utility to parse form as promise
const parseForm = (req) =>
  new Promise((resolve, reject) => {
    const form = formidable({ keepExtensions: true });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });

export default async function handler(req, res) {
  console.log("API invoked");

  if (req.method !== "POST") {
    console.log("Method not allowed:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { files } = await parseForm(req);
    console.log("Files received:", files);

    const file = Array.isArray(files.image_file) ? files.image_file[0] : files.image_file;
    if (!file) {
      console.log("No file uploaded");
      return res.status(400).json({ error: "No image uploaded" });
    }

    // Use the file buffer from formidable directly
    const buffer = file?.filepath ? Buffer.from(await fs.promises.readFile(file.filepath)) : null;
    if (!buffer) {
      console.log("Buffer is empty");
      return res.status(500).json({ error: "Failed to read uploaded file" });
    }

    console.log("Buffer size:", buffer.length);

    // Prepare FormData for remove.bg
    const fd = new FormData();
    fd.append("image_file", buffer, { filename: file.originalFilename || "image.png" });
    fd.append("size", "auto");

    console.log("Sending request to remove.bg");

    const r = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.REMOVEBG_API_KEY,
        ...fd.getHeaders(),
      },
      body: fd,
    });

    console.log("Remove.bg status:", r.status);

    if (!r.ok) {
      const text = await r.text();
      console.error("Remove.bg returned error:", text);
      return res.status(r.status).send(text);
    }

    const resultBuffer = Buffer.from(await r.arrayBuffer());
    console.log("Received processed image buffer:", resultBuffer.length);

    res.setHeader("Content-Type", "image/png");
    res.send(resultBuffer);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: error.message });
  }
}
