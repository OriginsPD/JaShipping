import { protectedProcedure, publicProcedure, router } from "../index";
import { addressRouter } from "./address";
import { adminRouter } from "./admin";
import { packagesRouter } from "./packages";
import { shipmentsRouter } from "./shipments";
import { staffRouter } from "./staff";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.session.user,
		};
	}),
	address: addressRouter,
	packages: packagesRouter,
	shipments: shipmentsRouter,
	staff: staffRouter,
	admin: adminRouter,
});
export type AppRouter = typeof appRouter;
