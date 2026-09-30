import { user } from "@JaShipping/db/schema/auth";
import {
	customerProfile,
	packages,
	shipment,
	shipmentPackage,
} from "@JaShipping/db/schema/shipping";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { router, staffProcedure } from "../index";
import {
	PACKAGE_STATUSES,
	type PackageStatus,
	SHIPMENT_STATUSES,
	type ShipmentStatus,
} from "../lib/warehouse";

function normalizeSuite(raw: string): string {
	return raw.trim().toUpperCase();
}

const receiveInputSchema = z.object({
	trackingNumber: z.string().min(1).max(128),
	carrier: z.string().min(1).max(64),
	weightLbs: z.string().regex(/^\d+(\.\d{1,2})?$/, "Weight must be a decimal"),
	notes: z.string().max(1000).optional(),
	description: z.string().max(500).optional(),
	/** Matched customer suite (required). */
	suiteCode: z.string().min(1).max(32),
	/**
	 * Link to an existing expected package, OR pass createNew: true.
	 * Mark received is disabled in UI until one of these is set.
	 */
	packageId: z.string().min(1).optional(),
	createNew: z.boolean().optional(),
});

const STAFF_QUEUE_STATUSES = ["requested", "packed", "in_transit"] as const;

const NEXT_SHIPMENT: Record<
	ShipmentStatus,
	{ packageStatus: PackageStatus | null }
> = {
	requested: { packageStatus: "in_shipment" },
	packed: { packageStatus: "in_shipment" },
	in_transit: { packageStatus: "in_transit" },
	delivered: { packageStatus: "delivered" },
	cancelled: { packageStatus: null },
};

const ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
	requested: ["packed", "cancelled"],
	packed: ["in_transit", "cancelled"],
	in_transit: ["delivered", "cancelled"],
	delivered: [],
	cancelled: [],
};

export const staffRouter = router({
	matchSuite: staffProcedure
		.input(z.object({ query: z.string().min(1).max(64) }))
		.query(async ({ ctx, input }) => {
			const suiteCode = normalizeSuite(
				input.query.split("·")[0] ?? input.query,
			);
			const [profile] = await ctx.db
				.select({
					userId: customerProfile.userId,
					suiteCode: customerProfile.suiteCode,
					role: customerProfile.role,
					name: user.name,
					email: user.email,
				})
				.from(customerProfile)
				.innerJoin(user, eq(user.id, customerProfile.userId))
				.where(eq(customerProfile.suiteCode, suiteCode))
				.limit(1);

			if (!profile) {
				return { match: null as null };
			}

			const expected = await ctx.db
				.select()
				.from(packages)
				.where(
					and(
						eq(packages.customerUserId, profile.userId),
						eq(packages.status, "expected"),
					),
				)
				.orderBy(desc(packages.createdAt))
				.limit(10);

			return {
				match: {
					...profile,
					expectedPackages: expected,
					pendingInboundCount: expected.length,
				},
			};
		}),

	receivePackage: staffProcedure
		.input(receiveInputSchema)
		.mutation(async ({ ctx, input }) => {
			if (!input.packageId && !input.createNew) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Match an expected package or explicitly create a new one",
				});
			}
			if (input.packageId && input.createNew) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Provide either packageId or createNew, not both",
				});
			}

			const suiteCode = normalizeSuite(input.suiteCode);
			const [profile] = await ctx.db
				.select()
				.from(customerProfile)
				.where(eq(customerProfile.suiteCode, suiteCode))
				.limit(1);
			if (!profile) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No customer matched that suite",
				});
			}

			const receivedAt = new Date();
			const weightLbs = input.weightLbs;

			if (input.packageId) {
				const [existing] = await ctx.db
					.select()
					.from(packages)
					.where(
						and(
							eq(packages.id, input.packageId),
							eq(packages.customerUserId, profile.userId),
						),
					)
					.limit(1);
				if (!existing) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Expected package not found for this customer",
					});
				}
				const [updated] = await ctx.db
					.update(packages)
					.set({
						trackingNumber: input.trackingNumber,
						carrier: input.carrier,
						weightLbs,
						notes: input.notes,
						description: input.description ?? existing.description,
						status: "received",
						receivedAt,
						suiteCode: profile.suiteCode,
					})
					.where(eq(packages.id, existing.id))
					.returning();
				return updated;
			}

			const id = crypto.randomUUID();
			const [created] = await ctx.db
				.insert(packages)
				.values({
					id,
					customerUserId: profile.userId,
					suiteCode: profile.suiteCode,
					trackingNumber: input.trackingNumber,
					carrier: input.carrier,
					weightLbs,
					notes: input.notes,
					description: input.description,
					status: "received",
					receivedAt,
				})
				.returning();
			return created;
		}),

	outboundQueue: staffProcedure
		.input(
			z
				.object({
					status: z.enum(STAFF_QUEUE_STATUSES).optional(),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const statusFilter = input?.status
				? [input.status]
				: [...STAFF_QUEUE_STATUSES];
			const rows = await ctx.db
				.select({
					shipment: shipment,
					customerName: user.name,
					customerEmail: user.email,
				})
				.from(shipment)
				.innerJoin(user, eq(user.id, shipment.customerUserId))
				.where(inArray(shipment.status, statusFilter))
				.orderBy(desc(shipment.createdAt));

			return rows.map((row) => ({
				...row.shipment,
				customerName: row.customerName,
				customerEmail: row.customerEmail,
			}));
		}),

	outboundById: staffProcedure
		.input(z.object({ id: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const [row] = await ctx.db
				.select({
					shipment: shipment,
					customerName: user.name,
					customerEmail: user.email,
				})
				.from(shipment)
				.innerJoin(user, eq(user.id, shipment.customerUserId))
				.where(eq(shipment.id, input.id))
				.limit(1);
			if (!row) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Shipment not found",
				});
			}

			const linked = await ctx.db
				.select({
					package: packages,
				})
				.from(shipmentPackage)
				.innerJoin(packages, eq(packages.id, shipmentPackage.packageId))
				.where(eq(shipmentPackage.shipmentId, input.id));

			return {
				...row.shipment,
				customerName: row.customerName,
				customerEmail: row.customerEmail,
				packages: linked.map((l) => l.package),
			};
		}),

	updateOutbound: staffProcedure
		.input(
			z.object({
				id: z.string().min(1),
				status: z.enum(SHIPMENT_STATUSES).optional(),
				outboundTrackingNumber: z.string().min(1).max(128).optional(),
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

			const nextStatus = (input.status ?? existing.status) as ShipmentStatus;
			if (input.status && input.status !== existing.status) {
				const allowed =
					ALLOWED_TRANSITIONS[existing.status as ShipmentStatus] ?? [];
				if (!allowed.includes(input.status)) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Cannot transition shipment from ${existing.status} to ${input.status}`,
					});
				}
			}

			const [updated] = await ctx.db
				.update(shipment)
				.set({
					status: nextStatus,
					outboundTrackingNumber:
						input.outboundTrackingNumber ?? existing.outboundTrackingNumber,
				})
				.where(eq(shipment.id, input.id))
				.returning();

			if (input.status && input.status !== existing.status) {
				const packageStatus = NEXT_SHIPMENT[input.status].packageStatus;
				if (packageStatus) {
					const linkedIds = await ctx.db
						.select({ packageId: shipmentPackage.packageId })
						.from(shipmentPackage)
						.where(eq(shipmentPackage.shipmentId, input.id));
					const ids = linkedIds.map((r) => r.packageId);
					if (ids.length > 0) {
						await ctx.db
							.update(packages)
							.set({ status: packageStatus })
							.where(inArray(packages.id, ids));
					}
				}
			}

			return updated;
		}),

	/** Lightweight counts for staff/admin shells (no invented fee metrics). */
	opsCounts: staffProcedure.query(async ({ ctx }) => {
		const [pkgOpen] = await ctx.db
			.select({ count: sql<number>`count(*)::int` })
			.from(packages)
			.where(
				inArray(packages.status, [
					"expected",
					"received",
					"ready_to_ship",
					"in_shipment",
					"in_transit",
				]),
			);
		const [shipActive] = await ctx.db
			.select({ count: sql<number>`count(*)::int` })
			.from(shipment)
			.where(inArray(shipment.status, ["requested", "packed", "in_transit"]));
		const [receivedToday] = await ctx.db
			.select({ count: sql<number>`count(*)::int` })
			.from(packages)
			.where(
				sql`${packages.receivedAt} is not null and ${packages.receivedAt}::date = current_date`,
			);
		const [usersCount] = await ctx.db
			.select({ count: sql<number>`count(*)::int` })
			.from(customerProfile);

		return {
			users: usersCount?.count ?? 0,
			packagesOpen: pkgOpen?.count ?? 0,
			shipmentsActive: shipActive?.count ?? 0,
			receivedToday: receivedToday?.count ?? 0,
			packageStatuses: PACKAGE_STATUSES,
			shipmentStatuses: SHIPMENT_STATUSES,
		};
	}),
});
