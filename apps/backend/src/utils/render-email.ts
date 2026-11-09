import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ejs from "ejs";

const currentDir = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(currentDir, "..", "templates");

export type EmailTemplate = "verify-email-otp" | "reset-password";

export const renderEmail = async <T extends object>(
  template: EmailTemplate,
  data: T,
): Promise<string> => {
  const filename = join(templatesDir, `${template}.ejs`);
  return ejs.renderFile(filename, data, { async: true });
};
