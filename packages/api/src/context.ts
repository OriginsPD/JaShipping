import type { Session } from "@JaShipping/auth";
import type { Database } from "@JaShipping/db";

export type Context = {
  session: Session | null;
  db: Database;
};
