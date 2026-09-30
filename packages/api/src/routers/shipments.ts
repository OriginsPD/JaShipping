import {
	packages,
	shipment,
	shipmentPackage,
} from "@JaShipping/db/schema/shipping";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { ensureCustomerProfile } from "../lib/profile";
import {
	FEE_NOTE_UNVERIFIED,
	SHIPPABLE_PACKAGE_STATUSES,
} from "../lib/warehouse";

const jamaicaDestinationSchema = z.object({
	destFullName: z.string().min(1).max(120),
	destLine1: z.string().min(1).max(200),
	destLine2: z.string().max(200).optional(),
	destCity: z.string().min(1).max(120),
	destParish: z.string().min(1).max(120),
	destPostalCode: z.string().max(32).optional(),
	destPhone: z.string().max(40).optional(),
});

export const shipmentsRouter = router({
	listMine: protectedProcedure.query(async ({ ctx }) => {
		const profile = await ensureCustomerProfile(ctx);
		return ctx.db
			.select()
			.from(shipment)
			.where(eq(shipment.customerUserId, profile.userId));
	}),

	requestToShip: protectedProcedure
		.input(
			z.object({
				packageIds: z.array(z.string().min(1)).min(1).max(50),
				destination: jamaicaDestinationSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const profile = await ensureCustomerProfile(ctx);
			const uniqueIds = [...new Set(input.packageIds)];

			const owned = await ctx.db
				.select()
				.from(packages)
				.where(
					and(
						eq(packages.customerUserId, profile.userId),
						inArray(packages.id, uniqueIds),
					),
				);

			if (owned.length !== uniqueIds.length) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "One or more packages were not found",
				});
			}

			for (const pkg of owned) {
				if (
					!(SHIPPABLE_PACKAGE_STATUSES as readonly string[]).includes(
						pkg.status,
					)
				) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Package ${pkg.id} is not ready to ship (status: ${pkg.status})`,
					});
				}
			}

			const shipmentId = crypto.randomUUID();

			const [created] = await ctx.db
				.insert(shipment)
				.values({
					id: shipmentId,
					customerUserId: profile.userId,
					status: "requested",
					destFullName: input.destination.destFullName,
					destLine1: input.destination.destLine1,
					destLine2: input.destination.destLine2,
					destCity: input.destination.destCity,
					destParish: input.destination.destParish,
					destPostalCode: input.destination.destPostalCode,
					destCountry: "JM",
					destPhone: input.destination.destPhone,
					feeNote: FEE_NOTE_UNVERIFIED,
					packageCount: owned.length,
				})
				.returning();

			await ctx.db.insert(shipmentPackage).values(
				owned.map((pkg) => ({
					shipmentId,
					packageId: pkg.id,
				})),
			);

			await ctx.db
				.update(packages)
				.set({ status: "in_shipment" })
				.where(inArray(packages.id, uniqueIds));

			return created;
		}),
});
