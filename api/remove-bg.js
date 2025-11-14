import Busboy from "busboy";
import FormData from "form-data";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const fileBuffer = await new Promise((resolve, reject) => {
      const busboy = Busboy({ headers: req.headers });
      let buffer = Buffer.alloc(0);

      busboy.on("file", (name, file) => {
        file.on("data", (data) => {
          buffer = Buffer.concat([buffer, data]);
        });
      });

      busboy.on("finish", () => resolve(buffer));
      busboy.on("error", reject);

      req.pipe(busboy);
    });

    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: "No file received" });
    }

    console.log("✔ File buffer received:", fileBuffer.length);

    // build form-data to send to remove.bg
    const fd = new FormData();
    fd.append("image_file", fileBuffer, { filename: "upload.png" });
    fd.append("size", "auto");

    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.REMOVEBG_API_KEY,
        ...fd.getHeaders(),
      },
      body: fd,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Remove.bg error:", text);
      return res.status(response.status).send(text);
    }

    const output = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", "image/png");
    res.send(output);

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}
