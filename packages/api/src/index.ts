import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";
import { ensureCustomerProfile } from "./lib/profile";
import type { UserRole } from "./lib/warehouse";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.session) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication required",
			cause: "No session",
		});
	}
	return next({
		ctx: {
			...ctx,
			session: ctx.session,
		},
	});
});

async function requireRole(
	ctx: Context & { session: NonNullable<Context["session"]> },
	allowed: readonly UserRole[],
) {
	const profile = await ensureCustomerProfile(ctx);
	if (!(allowed as readonly string[]).includes(profile.role)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Insufficient role for this action",
		});
	}
	return profile;
}

/** Staff or admin — warehouse ops. Customers get FORBIDDEN. */
export const staffProcedure = protectedProcedure.use(async ({ ctx, next }) => {
	const profile = await requireRole(ctx, ["staff", "admin"]);
	return next({
		ctx: {
			...ctx,
			profile,
		},
	});
});

/** Admin only. Staff and customers get FORBIDDEN. */
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
	const profile = await requireRole(ctx, ["admin"]);
	return next({
		ctx: {
			...ctx,
			profile,
		},
	});
});
