import { Request, Response } from "@google-cloud/functions-framework";
import escapeHtml from "escape-html";
import { getWelcomeMessage } from "@productbrew/greetings";

export function helloWorld(req: Request, res: Response) {
  const reqName = String(req.query.name || "Anonymous");
  const name = escapeHtml(reqName);

  const message = getWelcomeMessage(name);

  res.send(`<pre>${message}</pre>`);
}
