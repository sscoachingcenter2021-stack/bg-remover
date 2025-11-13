import formidable from "formidable";
import fs from "fs";
import FormData from "form-data";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  console.log("API hit"); // ✅ First log: API invoked

  if (req.method !== "POST") {
    console.log("Method not allowed:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new formidable.IncomingForm({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    console.log("Form parsed"); // ✅ Form parsing finished
    if (err) {
      console.error("Formidable parse error:", err);
      return res.status(500).json({ error: err.message });
    }

    console.log("FILES received:", files); // ✅ Check what files Formidable got

    const file = Array.isArray(files.image_file)
      ? files.image_file[0]
      : files.image_file;

    if (!file) {
      console.log("No file found in the request");
      return res.status(400).json({ error: "No image uploaded" });
    }

    console.log("File info:", file);

    try {
      // Read buffer from uploaded file
      const buffer = fs.readFileSync(file.filepath);
      console.log("Buffer length:", buffer.length); // ✅ Check buffer size

      // Prepare FormData for remove.bg
      const fd = new FormData();
      fd.append("image_file", buffer, { filename: file.originalFilename || "image.png" });
      fd.append("size", "auto");

      console.log("Sending request to remove.bg...");

      const r = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: {
          "X-Api-Key": process.env.REMOVEBG_API_KEY,
          ...fd.getHeaders(),
        },
        body: fd,
      });

      console.log("Remove.bg response status:", r.status);

      if (!r.ok) {
        const text = await r.text();
        console.error("Remove.bg error response:", text);
        return res.status(r.status).send(text);
      }

      const resultBuffer = Buffer.from(await r.arrayBuffer());
      console.log("Received processed image buffer:", resultBuffer.length);

      res.setHeader("Content-Type", "image/png");
      res.send(resultBuffer);
    } catch (error) {
      console.error("Unexpected error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
