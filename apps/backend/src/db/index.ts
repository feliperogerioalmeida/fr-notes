import { drizzle } from "drizzle-orm/node-postgres";

import { DATABASE_URL } from "@/config/env.js";

import * as schema from "./schema.js";

export const db = drizzle(DATABASE_URL, { schema });

export type Database = typeof db;
