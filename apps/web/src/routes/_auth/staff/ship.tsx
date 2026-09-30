import { Badge } from "@JaShipping/ui/components/badge";
import { Button } from "@JaShipping/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@JaShipping/ui/components/empty";
import { Input } from "@JaShipping/ui/components/input";
import { Label } from "@JaShipping/ui/components/label";
import { Skeleton } from "@JaShipping/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/staff/ship")({
	component: StaffShipPage,
});

function statusBadge(status: string) {
	switch (status) {
		case "requested":
			return "success" as const;
		case "packed":
			return "warning" as const;
		case "in_transit":
			return "warning" as const;
		case "delivered":
			return "success" as const;
		default:
			return "secondary" as const;
	}
}

function StaffShipPage() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const queueQuery = useQuery(trpc.staff.outboundQueue.queryOptions());
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [outboundTracking, setOutboundTracking] = useState("");

	useEffect(() => {
		const first = queueQuery.data?.[0];
		if (!selectedId && first) {
			setSelectedId(first.id);
		}
	}, [queueQuery.data, selectedId]);

	const detailQuery = useQuery({
		...trpc.staff.outboundById.queryOptions({ id: selectedId ?? "" }),
		enabled: Boolean(selectedId),
	});

	useEffect(() => {
		if (detailQuery.data) {
			setOutboundTracking(detailQuery.data.outboundTrackingNumber ?? "");
		}
	}, [detailQuery.data]);

	const updateMutation = useMutation(
		trpc.staff.updateOutbound.mutationOptions({
			onSuccess: async () => {
				toast.success("Shipment updated");
				await queryClient.invalidateQueries();
			},
			onError: (error) => {
				toast.error(error.message);
			},
		}),
	);

	const detail = detailQuery.data;

	return (
		<div className="mx-auto w-full max-w-6xl px-4 py-8">
			<p className="font-medium text-primary text-sm uppercase tracking-wide">
				JaShipping Ops
			</p>
			<h1 className="mt-1 font-semibold text-3xl">Outbound shipments</h1>
			<p className="mt-2 text-muted-foreground">
				Process customer ship requests: pack, label, update status.
			</p>

			<div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.2fr]">
				<section className="rounded-[var(--radius)] border border-border bg-card p-4">
					<h2 className="px-2 font-semibold text-lg">Ready queue</h2>
					{queueQuery.isLoading ? (
						<div className="mt-4 space-y-2">
							<Skeleton className="h-16 w-full" />
							<Skeleton className="h-16 w-full" />
						</div>
					) : (queueQuery.data ?? []).length === 0 ? (
						<Empty className="mt-4 border-0">
							<EmptyHeader>
								<EmptyTitle>Queue empty</EmptyTitle>
								<EmptyDescription>
									Requested shipments appear here for packing.
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<ul className="mt-4 space-y-2">
							{(queueQuery.data ?? []).map((row) => {
								const active = row.id === selectedId;
								return (
									<li key={row.id}>
										<button
											type="button"
											onClick={() => setSelectedId(row.id)}
											className={`flex w-full items-center justify-between gap-3 rounded-[var(--radius)] px-3 py-3 text-left transition-colors ${
												active
													? "bg-accent/30 ring-1 ring-accent"
													: "bg-muted hover:bg-muted/80"
											}`}
										>
											<div className="min-w-0">
												<p className="text-muted-foreground text-xs">
													{row.id.slice(0, 8)}
												</p>
												<p className="truncate font-medium">
													{row.customerName} · {row.packageCount} pkg
													{row.packageCount === 1 ? "" : "s"}
												</p>
											</div>
											<Badge variant={statusBadge(row.status)}>
												{row.status === "requested"
													? "Ready"
													: row.status.replaceAll("_", " ")}
											</Badge>
										</button>
									</li>
								);
							})}
						</ul>
					)}
				</section>

				<section className="rounded-[var(--radius)] border border-border bg-card p-6">
					{!selectedId ? (
						<p className="text-muted-foreground text-sm">
							Select a shipment from the queue.
						</p>
					) : detailQuery.isLoading ? (
						<Skeleton className="h-40 w-full" />
					) : !detail ? (
						<p className="text-muted-foreground text-sm">Shipment not found.</p>
					) : (
						<div className="space-y-5">
							<div>
								<h2 className="font-semibold text-xl">
									{detail.id.slice(0, 8)} · {detail.customerName}
								</h2>
								<p className="mt-1 text-muted-foreground text-sm">
									{[detail.destCity, detail.destParish, detail.destLine1]
										.filter(Boolean)
										.join(" · ")}{" "}
									(synthetic destination data)
								</p>
								<Badge className="mt-3" variant={statusBadge(detail.status)}>
									{detail.status.replaceAll("_", " ")}
								</Badge>
							</div>

							<div>
								<p className="font-medium text-sm">Contents</p>
								<ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
									{detail.packages.map((pkg) => (
										<li key={pkg.id}>
											{pkg.description || pkg.trackingNumber || pkg.id} ·{" "}
											{pkg.status.replaceAll("_", " ")}
										</li>
									))}
								</ul>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="outbound-tracking">Outbound tracking</Label>
									<Input
										id="outbound-tracking"
										value={outboundTracking}
										onChange={(e) => setOutboundTracking(e.target.value)}
										placeholder="Enter carrier tracking"
									/>
								</div>
								<div className="space-y-2">
									<Label>Fee note</Label>
									<p className="rounded-[var(--radius)] bg-muted px-3 py-2 text-sm">
										{detail.feeNote}
									</p>
								</div>
							</div>

							<p className="font-medium text-accent-foreground text-sm">
								Fee charged: UNVERIFIED placeholder — do not invent duty.
							</p>

							<div className="flex flex-wrap gap-3">
								<Button
									variant="outline"
									size="touch"
									disabled={
										updateMutation.isPending || detail.status !== "requested"
									}
									onClick={() =>
										updateMutation.mutate({
											id: detail.id,
											status: "packed",
											outboundTrackingNumber: outboundTracking || undefined,
										})
									}
								>
									Mark packed
								</Button>
								<Button
									variant="default"
									size="touch"
									disabled={
										updateMutation.isPending ||
										detail.status !== "packed" ||
										!outboundTracking
									}
									onClick={() =>
										updateMutation.mutate({
											id: detail.id,
											status: "in_transit",
											outboundTrackingNumber: outboundTracking,
										})
									}
								>
									Mark in transit
								</Button>
								<Button
									variant="outline"
									size="touch"
									disabled={
										updateMutation.isPending || detail.status !== "in_transit"
									}
									onClick={() =>
										updateMutation.mutate({
											id: detail.id,
											status: "delivered",
										})
									}
								>
									Mark delivered
								</Button>
							</div>
							{detail.status === "requested" ? (
								<p className="text-muted-foreground text-xs">
									Transitions: requested → packed → in transit → delivered.
									In-transit requires outbound tracking.
								</p>
							) : null}
						</div>
					)}
				</section>
			</div>
		</div>
	);
}
