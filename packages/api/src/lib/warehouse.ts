/**
 * Shared US warehouse receiving address for JaShipping MVP.
 * Suite code is per-customer; street/city come from this constant.
 */
export const US_WAREHOUSE = {
	name: "JaShipping Receiving",
	line1: "1847 Port Commerce Blvd",
	line2: null as string | null,
	city: "Miami",
	state: "FL",
	postalCode: "33132",
	country: "US",
} as const;

export const FEE_NOTE_UNVERIFIED = "UNVERIFIED — fees pending board approval";

export const PACKAGE_STATUSES = [
	"expected",
	"received",
	"ready_to_ship",
	"in_shipment",
	"in_transit",
	"delivered",
	"cancelled",
] as const;

export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

/** Statuses eligible for request-to-ship. */
export const SHIPPABLE_PACKAGE_STATUSES = [
	"received",
	"ready_to_ship",
] as const;

export const SHIPMENT_STATUSES = [
	"requested",
	"packed",
	"in_transit",
	"delivered",
	"cancelled",
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const USER_ROLES = ["customer", "staff", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export function generateSuiteCode(userId: string): string {
	const compact = userId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
	const suffix = (compact.slice(0, 6) || "USER00").padEnd(6, "0").slice(0, 6);
	return `JS-${suffix}`;
}
