import formidable from "formidable";
import FormData from "form-data";

export const config = {
  api: {
    bodyParser: false, // Required for file uploads
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    console.log("Method not allowed:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("Received request");

  const form = new formidable.IncomingForm({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parse error:", err);
      return res.status(500).json({ error: err.message });
    }

    console.log("Parsed files:", files);

    const file = Array.isArray(files.image_file)
      ? files.image_file[0]
      : files.image_file;

    if (!file) {
      console.error("No file uploaded");
      return res.status(400).json({ error: "No image uploaded" });
    }

    try {
      console.log("Preparing FormData for remove.bg");

      const fd = new FormData();
      fd.append("image_file", file.file, file.originalFilename || "image.png");
      fd.append("size", "auto");

      console.log("Sending image to remove.bg...");

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
        console.error("remove.bg API error:", text);
        return res.status(r.status).send(text);
      }

      const resultBuffer = Buffer.from(await r.arrayBuffer());

      res.setHeader("Content-Type", "image/png");
      res.send(resultBuffer);

      console.log("Successfully returned image!");
    } catch (error) {
      console.error("Backend error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
