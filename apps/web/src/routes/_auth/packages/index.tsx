import { Badge } from "@JaShipping/ui/components/badge";
import { Button } from "@JaShipping/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@JaShipping/ui/components/empty";
import { Skeleton } from "@JaShipping/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/packages/")({
	component: PackagesPage,
});

const FILTERS = [
	{ id: "all", label: "All" },
	{ id: "expected", label: "Expected" },
	{ id: "received", label: "Received" },
	{ id: "ready_to_ship", label: "Ready" },
	{ id: "in_shipment", label: "In shipment" },
	{ id: "in_transit", label: "In transit" },
	{ id: "delivered", label: "Delivered" },
] as const;

function statusBadgeVariant(status: string) {
	switch (status) {
		case "received":
		case "ready_to_ship":
			return "success" as const;
		case "in_transit":
		case "in_shipment":
			return "warning" as const;
		case "cancelled":
			return "destructive" as const;
		default:
			return "secondary" as const;
	}
}

function PackagesPage() {
	const trpc = useTRPC();
	const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
	const listQuery = useQuery(trpc.packages.list.queryOptions());

	const rows = useMemo(() => {
		const data = listQuery.data ?? [];
		if (filter === "all") return data;
		return data.filter((row) => row.status === filter);
	}, [filter, listQuery.data]);

	const canRequestShip = (listQuery.data ?? []).some(
		(row) => row.status === "received" || row.status === "ready_to_ship",
	);

	return (
		<div className="mx-auto w-full max-w-4xl px-4 py-8">
			<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="font-medium text-primary text-sm uppercase tracking-wide">
						JaShipping
					</p>
					<h1 className="mt-1 font-semibold text-3xl">Packages</h1>
					<p className="mt-2 text-muted-foreground">
						Inbound inventory at your US suite.
					</p>
				</div>
				{canRequestShip ? (
					<Button
						variant="accent"
						size="touch"
						render={<Link to="/request-ship" />}
					>
						Request ship
					</Button>
				) : null}
			</div>

			<div className="mb-6 flex flex-wrap gap-2">
				{FILTERS.map((item) => (
					<Button
						key={item.id}
						size="sm"
						variant={filter === item.id ? "default" : "outline"}
						onClick={() => setFilter(item.id)}
					>
						{item.label}
					</Button>
				))}
			</div>

			{listQuery.isLoading ? (
				<div className="space-y-3">
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
			) : rows.length === 0 ? (
				<Empty className="border border-border border-dashed">
					<EmptyHeader>
						<EmptyTitle>No packages yet</EmptyTitle>
						<EmptyDescription>
							Ship to your US address. Packages appear here after warehouse
							receive.
						</EmptyDescription>
					</EmptyHeader>
					<Button
						variant="outline"
						size="touch"
						render={<Link to="/address" />}
					>
						View US address
					</Button>
				</Empty>
			) : (
				<ul className="divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
					{rows.map((pkg) => (
						<li key={pkg.id}>
							<Link
								to="/packages/$packageId"
								params={{ packageId: pkg.id }}
								className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-muted/50"
							>
								<div className="min-w-0">
									<p className="truncate font-medium">
										{pkg.description || pkg.trackingNumber || "Package"}
									</p>
									<p className="truncate text-muted-foreground text-sm">
										{pkg.carrier ? `${pkg.carrier} · ` : ""}
										{pkg.trackingNumber || "No tracking"}
									</p>
								</div>
								<Badge variant={statusBadgeVariant(pkg.status)}>
									{pkg.status.replaceAll("_", " ")}
								</Badge>
							</Link>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
