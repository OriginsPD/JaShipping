import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth/staff")({
	ssr: false,
	beforeLoad: async ({ context }) => {
		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({ to: "/login" });
		}

		// Role gate: resolve via tRPC me endpoint (customer_profile.role).
		const me = await context.queryClient.fetchQuery(
			context.trpc.address.me.queryOptions(),
		);
		if (me.role !== "staff" && me.role !== "admin") {
			throw redirect({ to: "/packages" });
		}
		return { session, role: me.role as "staff" | "admin" };
	},
	component: StaffLayout,
});

function StaffLayout() {
	return (
		<div className="min-h-full bg-background">
			<Outlet />
		</div>
	);
}
