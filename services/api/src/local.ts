import express from "express";
import cors from "cors";
import { handler } from "./handler.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.post("/generate", async (req, res) => {
  try {
    const resp = await handler({ body: JSON.stringify(req.body) });

    // Apply headers from the Lambda-style response
    const headers = resp.headers ?? {};
    for (const [k, v] of Object.entries(headers)) {
      res.setHeader(k, v as string);
    }

    if (resp.isBase64Encoded) {
      const buf = Buffer.from(resp.body, "base64");
      res.status(resp.statusCode).send(buf);
    } else {
      res.status(resp.statusCode).send(resp.body);
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? String(err) });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
  console.log(`Goonbits Sudoku API (local) listening on http://localhost:${port}`);
});
