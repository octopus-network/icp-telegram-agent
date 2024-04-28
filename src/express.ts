import express, { Express, Request, Response } from "express";
import { rbotCallback } from "./apps"

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const app: Express = express();

app.get('/healthz', (req: Request, res: Response) => {
  res.send('OK');
});

// apps
app.use(rbotCallback);

app.listen(3000, '0.0.0.0', () => {
  console.log('[server]: Server is running at http://0.0.0.0:3000');
});

// npx ts-node ./src/express.ts
