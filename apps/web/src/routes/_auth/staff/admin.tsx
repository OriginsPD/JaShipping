import { Badge } from "@JaShipping/ui/components/badge";
import { Skeleton } from "@JaShipping/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/staff/admin")({
	ssr: false,
	beforeLoad: async ({ context }) => {
		const me = await context.queryClient.fetchQuery(
			context.trpc.address.me.queryOptions(),
		);
		if (me.role !== "admin") {
			throw redirect({ to: "/staff/receive" });
		}
		return { role: "admin" as const };
	},
	component: AdminOverviewPage,
});

type Tab = "users" | "packages" | "shipments";

const PACKAGE_OPTIONS = [
	"expected",
	"received",
	"ready_to_ship",
	"in_shipment",
	"in_transit",
	"delivered",
	"cancelled",
] as const;

const SHIPMENT_OPTIONS = [
	"requested",
	"packed",
	"in_transit",
	"delivered",
	"cancelled",
] as const;

function AdminOverviewPage() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [tab, setTab] = useState<Tab>("users");

	const countsQuery = useQuery(trpc.staff.opsCounts.queryOptions());
	const usersQuery = useQuery({
		...trpc.admin.listUsers.queryOptions(),
		enabled: tab === "users",
	});
	const packagesQuery = useQuery({
		...trpc.admin.listPackages.queryOptions(),
		enabled: tab === "packages",
	});
	const shipmentsQuery = useQuery({
		...trpc.admin.listShipments.queryOptions(),
		enabled: tab === "shipments",
	});

	const invalidate = async () => {
		await queryClient.invalidateQueries();
	};

	const packageStatusMutation = useMutation(
		trpc.admin.updatePackageStatus.mutationOptions({
			onSuccess: async () => {
				toast.success("Package status updated");
				await invalidate();
			},
			onError: (e) => toast.error(e.message),
		}),
	);

	const shipmentStatusMutation = useMutation(
		trpc.admin.updateShipmentStatus.mutationOptions({
			onSuccess: async () => {
				toast.success("Shipment status updated");
				await invalidate();
			},
			onError: (e) => toast.error(e.message),
		}),
	);

	const roleMutation = useMutation(
		trpc.admin.updateUserRole.mutationOptions({
			onSuccess: async () => {
				toast.success("Role updated");
				await invalidate();
			},
			onError: (e) => toast.error(e.message),
		}),
	);

	const stats = [
		{ label: "Users", value: countsQuery.data?.users },
		{ label: "Packages open", value: countsQuery.data?.packagesOpen },
		{ label: "Shipments active", value: countsQuery.data?.shipmentsActive },
		{ label: "Received today", value: countsQuery.data?.receivedToday },
	];

	return (
		<div className="mx-auto w-full max-w-6xl px-4 py-8">
			<p className="font-medium text-primary text-sm uppercase tracking-wide">
				JaShipping Ops
			</p>
			<h1 className="mt-1 font-semibold text-3xl">Admin overview</h1>
			<p className="mt-2 text-muted-foreground">
				Users, packages, shipments at a glance — status + search first. Use
				synthetic PII only in fixtures.
			</p>

			<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{stats.map((stat) => (
					<div
						key={stat.label}
						className="rounded-[var(--radius)] border border-border bg-card p-5"
					>
						<p className="text-muted-foreground text-sm">{stat.label}</p>
						<p className="mt-2 font-semibold text-3xl text-primary">
							{countsQuery.isLoading ? "…" : (stat.value ?? 0)}
						</p>
					</div>
				))}
			</div>

			<div className="mt-8 flex flex-wrap gap-4 border-border border-b pb-2">
				{(
					[
						["users", "Users"],
						["packages", "Packages"],
						["shipments", "Shipments"],
					] as const
				).map(([id, label]) => (
					<button
						key={id}
						type="button"
						onClick={() => setTab(id)}
						className={`px-1 pb-2 text-sm transition-colors ${
							tab === id
								? "border-primary border-b-2 font-semibold text-primary"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						{label}
					</button>
				))}
			</div>

			<div className="mt-4 overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
				{tab === "users" ? (
					usersQuery.isLoading ? (
						<div className="p-4">
							<Skeleton className="h-32 w-full" />
						</div>
					) : (
						<table className="w-full min-w-[720px] text-left text-sm">
							<thead className="border-border border-b text-muted-foreground text-xs uppercase tracking-wide">
								<tr>
									<th className="px-4 py-3 font-medium">Name</th>
									<th className="px-4 py-3 font-medium">Email</th>
									<th className="px-4 py-3 font-medium">Suite</th>
									<th className="px-4 py-3 font-medium">Role</th>
									<th className="px-4 py-3 font-medium">Status</th>
								</tr>
							</thead>
							<tbody>
								{(usersQuery.data ?? []).map((row) => (
									<tr key={row.userId} className="border-border border-b">
										<td className="px-4 py-3 font-medium">{row.name}</td>
										<td className="px-4 py-3">{row.email}</td>
										<td className="px-4 py-3 text-primary">{row.suiteCode}</td>
										<td className="px-4 py-3">
											<select
												className="rounded-[var(--radius)] border border-input bg-background px-2 py-1"
												value={row.role}
												onChange={(e) =>
													roleMutation.mutate({
														userId: row.userId,
														role: e.target.value as
															| "customer"
															| "staff"
															| "admin",
													})
												}
											>
												<option value="customer">Customer</option>
												<option value="staff">Staff</option>
												<option value="admin">Admin</option>
											</select>
										</td>
										<td className="px-4 py-3">
											<Badge variant="success">Active</Badge>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)
				) : null}

				{tab === "packages" ? (
					packagesQuery.isLoading ? (
						<div className="p-4">
							<Skeleton className="h-32 w-full" />
						</div>
					) : (
						<table className="w-full min-w-[720px] text-left text-sm">
							<thead className="border-border border-b text-muted-foreground text-xs uppercase tracking-wide">
								<tr>
									<th className="px-4 py-3 font-medium">Package</th>
									<th className="px-4 py-3 font-medium">Customer</th>
									<th className="px-4 py-3 font-medium">Suite</th>
									<th className="px-4 py-3 font-medium">Status</th>
								</tr>
							</thead>
							<tbody>
								{(packagesQuery.data ?? []).map((row) => (
									<tr key={row.id} className="border-border border-b">
										<td className="px-4 py-3">
											<p className="font-medium">
												{row.description ||
													row.trackingNumber ||
													row.id.slice(0, 8)}
											</p>
											<p className="text-muted-foreground text-xs">
												{row.carrier || "—"}
											</p>
										</td>
										<td className="px-4 py-3">{row.customerName}</td>
										<td className="px-4 py-3 text-primary">{row.suiteCode}</td>
										<td className="px-4 py-3">
											<select
												className="rounded-[var(--radius)] border border-input bg-background px-2 py-1"
												value={row.status}
												onChange={(e) =>
													packageStatusMutation.mutate({
														id: row.id,
														status: e.target
															.value as (typeof PACKAGE_OPTIONS)[number],
													})
												}
											>
												{PACKAGE_OPTIONS.map((status) => (
													<option key={status} value={status}>
														{status.replaceAll("_", " ")}
													</option>
												))}
											</select>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)
				) : null}

				{tab === "shipments" ? (
					shipmentsQuery.isLoading ? (
						<div className="p-4">
							<Skeleton className="h-32 w-full" />
						</div>
					) : (
						<table className="w-full min-w-[720px] text-left text-sm">
							<thead className="border-border border-b text-muted-foreground text-xs uppercase tracking-wide">
								<tr>
									<th className="px-4 py-3 font-medium">Shipment</th>
									<th className="px-4 py-3 font-medium">Customer</th>
									<th className="px-4 py-3 font-medium">Destination</th>
									<th className="px-4 py-3 font-medium">Fee</th>
									<th className="px-4 py-3 font-medium">Status</th>
								</tr>
							</thead>
							<tbody>
								{(shipmentsQuery.data ?? []).map((row) => (
									<tr key={row.id} className="border-border border-b">
										<td className="px-4 py-3 font-medium">
											{row.id.slice(0, 8)} · {row.packageCount} pkg
										</td>
										<td className="px-4 py-3">{row.customerName}</td>
										<td className="px-4 py-3">
											{row.destCity}, {row.destParish}
										</td>
										<td className="px-4 py-3 text-xs">{row.feeNote}</td>
										<td className="px-4 py-3">
											<select
												className="rounded-[var(--radius)] border border-input bg-background px-2 py-1"
												value={row.status}
												onChange={(e) =>
													shipmentStatusMutation.mutate({
														id: row.id,
														status: e.target
															.value as (typeof SHIPMENT_OPTIONS)[number],
													})
												}
											>
												{SHIPMENT_OPTIONS.map((status) => (
													<option key={status} value={status}>
														{status.replaceAll("_", " ")}
													</option>
												))}
											</select>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)
				) : null}
			</div>

			<p className="mt-4 text-muted-foreground text-xs">
				Local fixture tip: promote a user via SQL — see README “Staff / admin
				fixture path”. Fees remain UNVERIFIED.
			</p>
			{roleMutation.isPending ||
			packageStatusMutation.isPending ||
			shipmentStatusMutation.isPending ? (
				<p className="mt-2 text-muted-foreground text-xs">Saving…</p>
			) : null}
		</div>
	);
}
