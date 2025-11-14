import Busboy from "busboy";
import FormData from "form-data";

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let fileBuffer = Buffer.alloc(0);

    console.log("📥 Starting Busboy...");

    await new Promise((resolve, reject) => {
      const busboy = Busboy({ headers: req.headers });

      busboy.on("file", (name, file) => {
        file.on("data", (data) => {
          fileBuffer = Buffer.concat([fileBuffer, data]);
        });
      });

      busboy.on("finish", () => resolve());
      busboy.on("error", reject);

      req.pipe(busboy);
    });

    if (fileBuffer.length === 0) {
      return res.status(400).json({ error: "No file received" });
    }

    console.log("✔ File received:", fileBuffer.length, "bytes");

    const fd = new FormData();
    fd.append("image_file", fileBuffer, { filename: "upload.jpg" });
    fd.append("size", "auto");

    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.REMOVEBG_API_KEY,
        ...fd.getHeaders()
      },
      body: fd
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ Remove.bg error:", errText);
      return res.status(response.status).send(errText);
    }

    const output = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", "image/png");
    return res.send(output);
  } catch (err) {
    console.error("🔥 SERVER ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
