import { Request, Response } from "@google-cloud/functions-framework";
import escapeHtml from "escape-html";

export function helloWorld(req: Request, res: Response) {
  const reqName = String(req.query.name || "Anonymous");
  const name = escapeHtml(reqName);

  res.send(`<pre>Welcome ${name}!</pre>`);
}
