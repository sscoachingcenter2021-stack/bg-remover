import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  // Add CORS headers to allow cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');  // Allow all origins (you can restrict this to specific domains)
  res.setHeader('Access-Control-Allow-Methods', 'POST'); // Allow only POST method
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key'); // Allow these headers

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const bodyBuffer = Buffer.concat(chunks);

    const apiKey = process.env.REMOVE_BG_KEY; // Your Remove.bg API key
    const r = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': req.headers['content-type'] || 'multipart/form-data'
      },
      body: bodyBuffer
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).send(text);
    }

    const imgBuffer = await r.arrayBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.send(Buffer.from(imgBuffer));
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error: ' + err.message);
  }
}
