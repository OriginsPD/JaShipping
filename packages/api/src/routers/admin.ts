import { user } from "@JaShipping/db/schema/auth";
import {
	customerProfile,
	packages,
	shipment,
} from "@JaShipping/db/schema/shipping";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, router } from "../index";
import {
	PACKAGE_STATUSES,
	SHIPMENT_STATUSES,
	USER_ROLES,
} from "../lib/warehouse";

export const adminRouter = router({
	listUsers: adminProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db
			.select({
				userId: customerProfile.userId,
				role: customerProfile.role,
				suiteCode: customerProfile.suiteCode,
				name: user.name,
				email: user.email,
				createdAt: customerProfile.createdAt,
			})
			.from(customerProfile)
			.innerJoin(user, eq(user.id, customerProfile.userId))
			.orderBy(desc(customerProfile.createdAt));
		return rows.map((row) => ({
			...row,
			/** Synthetic status for MVP admin table — accounts are active once profiled. */
			status: "active" as const,
		}));
	}),

	listPackages: adminProcedure.query(async ({ ctx }) => {
		return ctx.db
			.select({
				id: packages.id,
				customerUserId: packages.customerUserId,
				suiteCode: packages.suiteCode,
				trackingNumber: packages.trackingNumber,
				carrier: packages.carrier,
				description: packages.description,
				status: packages.status,
				weightLbs: packages.weightLbs,
				receivedAt: packages.receivedAt,
				createdAt: packages.createdAt,
				customerName: user.name,
				customerEmail: user.email,
			})
			.from(packages)
			.innerJoin(user, eq(user.id, packages.customerUserId))
			.orderBy(desc(packages.createdAt));
	}),

	listShipments: adminProcedure.query(async ({ ctx }) => {
		return ctx.db
			.select({
				id: shipment.id,
				customerUserId: shipment.customerUserId,
				status: shipment.status,
				destFullName: shipment.destFullName,
				destCity: shipment.destCity,
				destParish: shipment.destParish,
				destCountry: shipment.destCountry,
				feeNote: shipment.feeNote,
				outboundTrackingNumber: shipment.outboundTrackingNumber,
				packageCount: shipment.packageCount,
				createdAt: shipment.createdAt,
				customerName: user.name,
				customerEmail: user.email,
			})
			.from(shipment)
			.innerJoin(user, eq(user.id, shipment.customerUserId))
			.orderBy(desc(shipment.createdAt));
	}),

	updatePackageStatus: adminProcedure
		.input(
			z.object({
				id: z.string().min(1),
				status: z.enum(PACKAGE_STATUSES),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [existing] = await ctx.db
				.select()
				.from(packages)
				.where(eq(packages.id, input.id))
				.limit(1);
			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Package not found",
				});
			}
			const [updated] = await ctx.db
				.update(packages)
				.set({ status: input.status })
				.where(eq(packages.id, input.id))
				.returning();
			return updated;
		}),

	updateShipmentStatus: adminProcedure
		.input(
			z.object({
				id: z.string().min(1),
				status: z.enum(SHIPMENT_STATUSES),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [existing] = await ctx.db
				.select()
				.from(shipment)
				.where(eq(shipment.id, input.id))
				.limit(1);
			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Shipment not found",
				});
			}
			const [updated] = await ctx.db
				.update(shipment)
				.set({ status: input.status })
				.where(eq(shipment.id, input.id))
				.returning();
			return updated;
		}),

	/**
	 * Local/fixture role promotion only — not a production IAM surface.
	 * Synthetic emails preferred (see README staff/admin fixture path).
	 */
	updateUserRole: adminProcedure
		.input(
			z.object({
				userId: z.string().min(1),
				role: z.enum(USER_ROLES),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [existing] = await ctx.db
				.select()
				.from(customerProfile)
				.where(eq(customerProfile.userId, input.userId))
				.limit(1);
			if (!existing) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User profile not found",
				});
			}
			const [updated] = await ctx.db
				.update(customerProfile)
				.set({ role: input.role })
				.where(eq(customerProfile.userId, input.userId))
				.returning();
			return updated;
		}),
});
