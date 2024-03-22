import express, { Express, Request, Response } from "express";
import { helloworldCallback } from "./apps"

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const app: Express = express();
const port = process.env.PORT || 3000;

app.get('/healthz', (req: Request, res: Response) => {
  res.send('OK');
});

// apps
app.use(helloworldCallback);


app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

// npx ts-node ./src/express.ts
