/**
 * Phase 4 synthetic pilot (happy path + failure path).
 *
 * Prerequisites:
 * - Postgres reachable via apps/server/.env DATABASE_URL
 * - API server on SERVER_URL (default http://localhost:3000): `bun run dev:server`
 *
 * Run from repo root:
 *   bun run pilot:phase4
 *
 * Or from apps/server:
 *   bun scripts/phase4-pilot.ts
 *
 * Synthetic emails use *.jashipping.example. Staff is promoted via SQL fixture path.
 */

import { ENV } from "../src/env.server";

const SERVER_URL = (
	process.env.SERVER_URL ??
	process.env.BETTER_AUTH_URL ??
	"http://localhost:3000"
).replace(/\/$/, "");

const PASSWORD = "PilotPass123!";
const stamp = Date.now().toString(36);
const CUSTOMER_EMAIL = `customer-${stamp}@jashipping.example`;
const STAFF_EMAIL = `staff-${stamp}@jashipping.example`;

type StepResult = {
	step: string;
	ok: boolean;
	detail?: unknown;
	error?: string;
};

type AuthUser = { id: string; email: string; name: string };

function cookieFromSetCookie(header: string | null): string | null {
	if (!header) return null;
	const first = header.split(",")[0] ?? header;
	const token = first.split(";")[0]?.trim();
	return token || null;
}

async function signUp(
	email: string,
	name: string,
): Promise<{
	user: AuthUser;
	cookie: string;
}> {
	const res = await fetch(`${SERVER_URL}/api/auth/sign-up/email`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password: PASSWORD, name }),
	});
	const raw = await res.text();
	let body: {
		user?: AuthUser;
		message?: string;
		error?: { message?: string };
		token?: string;
	} = {};
	try {
		body = raw ? (JSON.parse(raw) as typeof body) : {};
	} catch {
		throw new Error(
			`sign-up failed (${res.status}): non-JSON body: ${raw.slice(0, 200)}`,
		);
	}
	if (!res.ok || !body.user) {
		throw new Error(
			`sign-up failed (${res.status}): ${body.message ?? body.error?.message ?? (raw || JSON.stringify(body))}`,
		);
	}
	const fromHeader = cookieFromSetCookie(res.headers.get("set-cookie"));
	const cookie =
		fromHeader ??
		(body.token ? `better-auth.session_token=${body.token}` : null);
	if (!cookie) {
		throw new Error("sign-up succeeded but no session cookie/token");
	}
	return { user: body.user, cookie };
}

async function trpcQuery<T>(
	path: string,
	cookie: string,
	input?: unknown,
): Promise<T> {
	const url = new URL(`${SERVER_URL}/trpc/${path}`);
	if (input !== undefined) {
		url.searchParams.set("input", JSON.stringify(input));
	}
	const res = await fetch(url, {
		headers: { Cookie: cookie },
	});
	const body = (await res.json()) as {
		result?: { data?: T };
		error?: { message?: string; data?: { code?: string } };
	};
	if (body.error) {
		const err = new Error(body.error.message ?? "tRPC query error") as Error & {
			code?: string;
		};
		err.code = body.error.data?.code;
		throw err;
	}
	return body.result?.data as T;
}

async function trpcMutate<T>(
	path: string,
	cookie: string,
	input: unknown,
): Promise<T> {
	/** Match @trpc/client httpBatchLink wire format used by apps/web. */
	const res = await fetch(`${SERVER_URL}/trpc/${path}?batch=1`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Cookie: cookie,
		},
		body: JSON.stringify({ "0": input }),
	});
	const body = (await res.json()) as Array<{
		result?: { data?: T };
		error?: { message?: string; data?: { code?: string } };
	}>;
	const item = body[0];
	if (!item) {
		throw new Error(`empty tRPC batch response for ${path}`);
	}
	if (item.error) {
		const err = new Error(
			item.error.message ?? "tRPC mutation error",
		) as Error & {
			code?: string;
		};
		err.code = item.error.data?.code;
		throw err;
	}
	return item.result?.data as T;
}

async function promoteRole(email: string, role: "staff" | "admin") {
	const db = new Bun.SQL(ENV.DATABASE_URL);
	try {
		const rows = await db`
			UPDATE customer_profile
			SET role = ${role}
			WHERE user_id = (SELECT id FROM "user" WHERE email = ${email})
			RETURNING user_id, role, suite_code
		`;
		if (!rows.length) {
			throw new Error(`promoteRole: no customer_profile for ${email}`);
		}
		return rows[0];
	} finally {
		await db.close();
	}
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

async function main() {
	const steps: StepResult[] = [];
	const report: Record<string, unknown> = {
		pilot: "phase4-synthetic",
		serverUrl: SERVER_URL,
		customerEmail: CUSTOMER_EMAIL,
		staffEmail: STAFF_EMAIL,
		startedAt: new Date().toISOString(),
	};

	const record = (step: string, fn: () => Promise<unknown>) =>
		fn()
			.then((detail) => {
				steps.push({ step, ok: true, detail });
				return detail;
			})
			.catch((e: unknown) => {
				const error = e instanceof Error ? e.message : String(e);
				steps.push({ step, ok: false, error });
				throw e;
			});

	try {
		const health = await record("healthCheck", async () => {
			const res = await fetch(`${SERVER_URL}/`);
			const text = await res.text();
			assert(
				res.ok && text === "OK",
				`server health failed: ${res.status} ${text}`,
			);
			return text;
		});
		report.health = health;

		const customer = (await record("customer.signUp", () =>
			signUp(CUSTOMER_EMAIL, `Pilot Customer ${stamp}`),
		)) as { user: AuthUser; cookie: string };

		const staff = (await record("staff.signUp", () =>
			signUp(STAFF_EMAIL, `Pilot Staff ${stamp}`),
		)) as { user: AuthUser; cookie: string };

		await record("staff.ensureProfile", () =>
			trpcQuery("address.me", staff.cookie),
		);

		const address = (await record("customer.viewUsAddress", () =>
			trpcQuery<{
				suiteCode: string;
				role: string;
				formattedLines: string[];
				copyText: string;
			}>("address.myUsAddress", customer.cookie),
		)) as {
			suiteCode: string;
			role: string;
			formattedLines: string[];
			copyText: string;
		};
		assert(address.suiteCode?.startsWith("JS-"), "suite code missing");
		assert(address.role === "customer", "expected customer role");
		report.suiteCode = address.suiteCode;

		await record("staff.promoteViaSqlFixture", () =>
			promoteRole(STAFF_EMAIL, "staff"),
		);

		/** Failure path: customer forbidden on staff procedure. */
		await record("failure.customerForbiddenOnStaff", async () => {
			try {
				await trpcQuery("staff.opsCounts", customer.cookie);
				throw new Error("expected FORBIDDEN but staff.opsCounts succeeded");
			} catch (e) {
				const err = e as Error & { code?: string };
				assert(
					err.code === "FORBIDDEN" ||
						/Insufficient role|FORBIDDEN/i.test(err.message),
					`expected FORBIDDEN, got: ${err.code ?? err.message}`,
				);
				return { code: err.code ?? "FORBIDDEN", message: err.message };
			}
		});

		const received = (await record("staff.receivePackage", () =>
			trpcMutate<{
				id: string;
				status: string;
				trackingNumber: string | null;
				suiteCode: string;
			}>("staff.receivePackage", staff.cookie, {
				trackingNumber: `PILOT-IN-${stamp}`,
				carrier: "UPS",
				weightLbs: "3.25",
				suiteCode: address.suiteCode,
				createNew: true,
				description: "Phase 4 pilot inbound package",
			}),
		)) as {
			id: string;
			status: string;
			trackingNumber: string | null;
			suiteCode: string;
		};
		assert(
			received.status === "received",
			`expected received, got ${received.status}`,
		);
		report.packageId = received.id;

		/** Failure path: invalid ship request rejected. */
		await record("failure.invalidShipRequestRejected", async () => {
			try {
				await trpcMutate("shipments.requestToShip", customer.cookie, {
					packageIds: ["00000000-0000-4000-8000-000000000000"],
					destination: {
						destFullName: "Pilot Recipient",
						destLine1: "1 Harbour St",
						destCity: "Kingston",
						destParish: "Kingston",
					},
				});
				throw new Error("expected BAD_REQUEST but requestToShip succeeded");
			} catch (e) {
				const err = e as Error & { code?: string };
				assert(
					err.code === "BAD_REQUEST" ||
						/not found|not ready|BAD_REQUEST/i.test(err.message),
					`expected BAD_REQUEST, got: ${err.code ?? err.message}`,
				);
				return { code: err.code ?? "BAD_REQUEST", message: err.message };
			}
		});

		const shipment = (await record("customer.requestToShip", () =>
			trpcMutate<{
				id: string;
				status: string;
				feeNote: string;
				packageCount: number;
			}>("shipments.requestToShip", customer.cookie, {
				packageIds: [received.id],
				destination: {
					destFullName: "Pilot Recipient",
					destLine1: "12 Hope Road",
					destCity: "Kingston",
					destParish: "St. Andrew",
					destPostalCode: "JMAAW01",
					destPhone: "+18765550100",
				},
			}),
		)) as {
			id: string;
			status: string;
			feeNote: string;
			packageCount: number;
		};
		assert(
			shipment.status === "requested",
			`expected requested, got ${shipment.status}`,
		);
		assert(
			/UNVERIFIED/i.test(shipment.feeNote),
			`feeNote must stay UNVERIFIED, got: ${shipment.feeNote}`,
		);
		report.shipmentId = shipment.id;
		report.feeNote = shipment.feeNote;

		const packed = (await record("staff.outbound.packed", () =>
			trpcMutate<{ id: string; status: string }>(
				"staff.updateOutbound",
				staff.cookie,
				{
					id: shipment.id,
					status: "packed",
					outboundTrackingNumber: `PILOT-OUT-${stamp}`,
				},
			),
		)) as { id: string; status: string };
		assert(packed.status === "packed", `expected packed, got ${packed.status}`);

		const inTransit = (await record("staff.outbound.in_transit", () =>
			trpcMutate<{ id: string; status: string }>(
				"staff.updateOutbound",
				staff.cookie,
				{ id: shipment.id, status: "in_transit" },
			),
		)) as { id: string; status: string };
		assert(
			inTransit.status === "in_transit",
			`expected in_transit, got ${inTransit.status}`,
		);

		const delivered = (await record("staff.outbound.delivered", () =>
			trpcMutate<{ id: string; status: string }>(
				"staff.updateOutbound",
				staff.cookie,
				{ id: shipment.id, status: "delivered" },
			),
		)) as { id: string; status: string };
		assert(
			delivered.status === "delivered",
			`expected delivered, got ${delivered.status}`,
		);

		report.ok = true;
		report.exitCode = 0;
	} catch (e) {
		report.ok = false;
		report.exitCode = 1;
		report.fatalError = e instanceof Error ? e.message : String(e);
	}

	report.finishedAt = new Date().toISOString();
	report.steps = steps;
	report.summary = {
		passed: steps.filter((s) => s.ok).length,
		failed: steps.filter((s) => !s.ok).length,
		total: steps.length,
	};

	console.log(JSON.stringify(report, null, 2));
	process.exit(report.ok ? 0 : 1);
}

main();
