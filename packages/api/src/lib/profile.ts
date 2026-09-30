import { customerProfile } from "@JaShipping/db/schema/shipping";
import { eq } from "drizzle-orm";

import type { Context } from "../context";
import { generateSuiteCode, type UserRole } from "./warehouse";

type AuthedContext = Context & { session: NonNullable<Context["session"]> };

export async function ensureCustomerProfile(ctx: AuthedContext) {
	const userId = ctx.session.user.id;
	const [existing] = await ctx.db
		.select()
		.from(customerProfile)
		.where(eq(customerProfile.userId, userId))
		.limit(1);
	if (existing) {
		return existing;
	}

	let suiteCode = generateSuiteCode(userId);
	const [clash] = await ctx.db
		.select()
		.from(customerProfile)
		.where(eq(customerProfile.suiteCode, suiteCode))
		.limit(1);
	if (clash) {
		suiteCode = `${suiteCode}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
	}

	const [created] = await ctx.db
		.insert(customerProfile)
		.values({
			userId,
			role: "customer" satisfies UserRole,
			suiteCode,
		})
		.returning();

	if (!created) {
		throw new Error("Failed to create customer profile");
	}

	return created;
}
