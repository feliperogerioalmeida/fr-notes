import { eq } from "drizzle-orm";

import { db } from "@/db/index.js";
import { user } from "@/db/schema.js";

export const findUserByEmail = async (email: string) => {
  const [row] = await db.select().from(user).where(eq(user.email, email));
  return row ?? null;
};
