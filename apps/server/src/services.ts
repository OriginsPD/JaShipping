import { createAuth } from "@JaShipping/auth";
import { createDb } from "@JaShipping/db";

import { ENV } from "./env.server";

export const db = createDb(ENV);
export const auth = createAuth(ENV, db);
