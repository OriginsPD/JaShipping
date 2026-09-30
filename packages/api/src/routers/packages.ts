import { packages } from "@JaShipping/db/schema/shipping";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { ensureCustomerProfile } from "../lib/profile";
import { PACKAGE_STATUSES, SHIPPABLE_PACKAGE_STATUSES } from "../lib/warehouse";

export const packagesRouter = router({
	list: protectedProcedure
		.input(
			z
				.object({
					status: z.enum(PACKAGE_STATUSES).optional(),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const profile = await ensureCustomerProfile(ctx);
			const filters = [eq(packages.customerUserId, profile.userId)];
			if (input?.status) {
				filters.push(eq(packages.status, input.status));
			}
			return ctx.db
				.select()
				.from(packages)
				.where(and(...filters))
				.orderBy(desc(packages.createdAt));
		}),

	byId: protectedProcedure
		.input(z.object({ id: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const profile = await ensureCustomerProfile(ctx);
			const [row] = await ctx.db
				.select()
				.from(packages)
				.where(
					and(
						eq(packages.id, input.id),
						eq(packages.customerUserId, profile.userId),
					),
				)
				.limit(1);
			if (!row) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Package not found",
				});
			}
			return row;
		}),

	/** Customer-facing create for "expected" packages (optional self-report). Staff receive is Phase 3. */
	createExpected: protectedProcedure
		.input(
			z.object({
				trackingNumber: z.string().min(1).max(128).optional(),
				carrier: z.string().min(1).max(64).optional(),
				description: z.string().min(1).max(500).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const profile = await ensureCustomerProfile(ctx);
			const id = crypto.randomUUID();
			const [created] = await ctx.db
				.insert(packages)
				.values({
					id,
					customerUserId: profile.userId,
					suiteCode: profile.suiteCode,
					trackingNumber: input.trackingNumber,
					carrier: input.carrier,
					description: input.description,
					status: "expected",
				})
				.returning();
			return created;
		}),

	shippable: protectedProcedure.query(async ({ ctx }) => {
		const profile = await ensureCustomerProfile(ctx);
		const rows = await ctx.db
			.select()
			.from(packages)
			.where(eq(packages.customerUserId, profile.userId))
			.orderBy(desc(packages.createdAt));
		return rows.filter((row) =>
			(SHIPPABLE_PACKAGE_STATUSES as readonly string[]).includes(row.status),
		);
	}),
});
