import formidable from "formidable";
import FormData from "form-data";

export const config = { api: { bodyParser: false } };

const parseForm = (req) =>
  new Promise((resolve, reject) => {
    const form = formidable({
      keepExtensions: true,
      fileWriteStreamHandler: () => {
        // Write to memory instead of disk
        const chunks = [];
        return new (class extends require("stream").Writable {
          _write(chunk, encoding, callback) {
            chunks.push(chunk);
            callback();
          }
          get buffer() {
            return Buffer.concat(chunks);
          }
        })();
      },
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });

export default async function handler(req, res) {
  console.log("API invoked");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { files } = await parseForm(req);
    console.log("Files received:", files);

    const file = Array.isArray(files.image_file) ? files.image_file[0] : files.image_file;
    if (!file) return res.status(400).json({ error: "No image uploaded" });

    const buffer = file._writeStream?.buffer || file._data || file.filepath; // get buffer from memory
    if (!buffer) {
      console.log("Buffer is empty");
      return res.status(500).json({ error: "Failed to read uploaded file" });
    }

    console.log("Buffer size:", buffer.length);

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
