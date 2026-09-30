import { protectedProcedure, router } from "../index";
import { ensureCustomerProfile } from "../lib/profile";
import { US_WAREHOUSE } from "../lib/warehouse";

export const addressRouter = router({
	/** Returns assigned US warehouse address + suite; creates profile on first call. */
	myUsAddress: protectedProcedure.query(async ({ ctx }) => {
		const profile = await ensureCustomerProfile(ctx);
		return {
			suiteCode: profile.suiteCode,
			role: profile.role,
			warehouse: US_WAREHOUSE,
			formattedLines: [
				US_WAREHOUSE.name,
				`${profile.suiteCode}`,
				US_WAREHOUSE.line1,
				...(US_WAREHOUSE.line2 ? [US_WAREHOUSE.line2] : []),
				`${US_WAREHOUSE.city}, ${US_WAREHOUSE.state} ${US_WAREHOUSE.postalCode}`,
				US_WAREHOUSE.country,
			],
			copyText: [
				US_WAREHOUSE.name,
				profile.suiteCode,
				US_WAREHOUSE.line1,
				...(US_WAREHOUSE.line2 ? [US_WAREHOUSE.line2] : []),
				`${US_WAREHOUSE.city}, ${US_WAREHOUSE.state} ${US_WAREHOUSE.postalCode}`,
				"United States",
			].join("\n"),
		};
	}),

	me: protectedProcedure.query(async ({ ctx }) => {
		const profile = await ensureCustomerProfile(ctx);
		return {
			userId: profile.userId,
			role: profile.role,
			suiteCode: profile.suiteCode,
			email: ctx.session.user.email,
			name: ctx.session.user.name,
		};
	}),
});
