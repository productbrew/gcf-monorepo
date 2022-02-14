import { Request, Response } from "@google-cloud/functions-framework";
import escapeHtml from "escape-html";
import { getCowMessage } from "@productbrew/greetings";

export function funnyWorld(req: Request, res: Response) {
  const reqName = String(req.query.name || "Anonymous");
  const name = escapeHtml(reqName);

  const message = getCowMessage(name);

  res.send(`<pre>${message}</pre>`);
}
