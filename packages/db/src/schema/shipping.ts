import { defineRelationsPart } from "drizzle-orm";
import {
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/** Customer / staff / admin profile linked 1:1 to Better Auth user. */
export const customerProfile = pgTable(
	"customer_profile",
	{
		userId: text("user_id")
			.primaryKey()
			.references(() => user.id, { onDelete: "cascade" }),
		role: text("role").notNull().default("customer"),
		/** Unique suite code printed on inbound labels (e.g. JS-A1B2C3). */
		suiteCode: text("suite_code").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("customer_profile_suite_code_uidx").on(table.suiteCode),
		index("customer_profile_role_idx").on(table.role),
	],
);

/**
 * Inbound package inventory.
 * Status values: expected | received | ready_to_ship | in_shipment | in_transit | delivered | cancelled
 */
export const packages = pgTable(
	"package",
	{
		id: text("id").primaryKey(),
		customerUserId: text("customer_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		suiteCode: text("suite_code").notNull(),
		trackingNumber: text("tracking_number"),
		carrier: text("carrier"),
		description: text("description"),
		weightLbs: numeric("weight_lbs", { precision: 10, scale: 2 }),
		status: text("status").notNull().default("expected"),
		notes: text("notes"),
		receivedAt: timestamp("received_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("package_customer_user_id_idx").on(table.customerUserId),
		index("package_suite_code_idx").on(table.suiteCode),
		index("package_status_idx").on(table.status),
		index("package_tracking_number_idx").on(table.trackingNumber),
	],
);

/**
 * Outbound shipment request to Jamaica.
 * Fee amounts are intentionally absent — product copy must stay UNVERIFIED until board approval.
 */
export const shipment = pgTable(
	"shipment",
	{
		id: text("id").primaryKey(),
		customerUserId: text("customer_user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		status: text("status").notNull().default("requested"),
		destFullName: text("dest_full_name").notNull(),
		destLine1: text("dest_line1").notNull(),
		destLine2: text("dest_line2"),
		destCity: text("dest_city").notNull(),
		destParish: text("dest_parish").notNull(),
		destPostalCode: text("dest_postal_code"),
		destCountry: text("dest_country").notNull().default("JM"),
		destPhone: text("dest_phone"),
		/** Never invent rates — placeholder note only. */
		feeNote: text("fee_note")
			.notNull()
			.default("UNVERIFIED — fees pending board approval"),
		outboundTrackingNumber: text("outbound_tracking_number"),
		packageCount: integer("package_count").notNull().default(0),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		index("shipment_customer_user_id_idx").on(table.customerUserId),
		index("shipment_status_idx").on(table.status),
	],
);

export const shipmentPackage = pgTable(
	"shipment_package",
	{
		shipmentId: text("shipment_id")
			.notNull()
			.references(() => shipment.id, { onDelete: "cascade" }),
		packageId: text("package_id")
			.notNull()
			.references(() => packages.id, { onDelete: "restrict" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("shipment_package_uidx").on(table.shipmentId, table.packageId),
		index("shipment_package_package_id_idx").on(table.packageId),
	],
);

export const shippingRelations = defineRelationsPart(
	{ user, customerProfile, packages, shipment, shipmentPackage },
	(r) => ({
		customerProfile: {
			user: r.one.user({
				from: r.customerProfile.userId,
				to: r.user.id,
			}),
		},
		packages: {
			customer: r.one.user({
				from: r.packages.customerUserId,
				to: r.user.id,
			}),
		},
		shipment: {
			customer: r.one.user({
				from: r.shipment.customerUserId,
				to: r.user.id,
			}),
			shipmentPackages: r.many.shipmentPackage({
				from: r.shipment.id,
				to: r.shipmentPackage.shipmentId,
			}),
		},
		shipmentPackage: {
			shipment: r.one.shipment({
				from: r.shipmentPackage.shipmentId,
				to: r.shipment.id,
			}),
			package: r.one.packages({
				from: r.shipmentPackage.packageId,
				to: r.packages.id,
			}),
		},
	}),
);
