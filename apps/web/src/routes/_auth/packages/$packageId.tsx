import { Badge } from "@JaShipping/ui/components/badge";
import { Button } from "@JaShipping/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@JaShipping/ui/components/card";
import { Skeleton } from "@JaShipping/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/packages/$packageId")({
	component: PackageDetailPage,
});

function PackageDetailPage() {
	const { packageId } = Route.useParams();
	const trpc = useTRPC();
	const detailQuery = useQuery(
		trpc.packages.byId.queryOptions({ id: packageId }),
	);
	const eligible =
		detailQuery.data?.status === "received" ||
		detailQuery.data?.status === "ready_to_ship";

	return (
		<div className="mx-auto w-full max-w-2xl px-4 py-8">
			<Button
				variant="ghost"
				size="sm"
				className="mb-4"
				render={<Link to="/packages" />}
			>
				← Packages
			</Button>

			{detailQuery.isLoading ? (
				<Skeleton className="h-72 w-full" />
			) : detailQuery.isError || !detailQuery.data ? (
				<Card>
					<CardHeader>
						<CardTitle>Package not found</CardTitle>
					</CardHeader>
				</Card>
			) : (
				<Card className="rounded-[var(--radius)] shadow-none">
					<CardHeader className="flex flex-row items-start justify-between gap-4">
						<div>
							<p className="font-medium text-primary text-sm uppercase tracking-wide">
								Package
							</p>
							<CardTitle className="mt-1 text-2xl">
								{detailQuery.data.description ||
									detailQuery.data.trackingNumber ||
									detailQuery.data.id}
							</CardTitle>
						</div>
						<Badge variant="secondary">
							{detailQuery.data.status.replaceAll("_", " ")}
						</Badge>
					</CardHeader>
					<CardContent className="space-y-4 text-sm">
						<dl className="grid gap-3 sm:grid-cols-2">
							<div>
								<dt className="text-muted-foreground">Tracking</dt>
								<dd className="font-medium">
									{detailQuery.data.trackingNumber || "—"}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Carrier</dt>
								<dd className="font-medium">
									{detailQuery.data.carrier || "—"}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Weight (lbs)</dt>
								<dd className="font-medium">
									{detailQuery.data.weightLbs ?? "—"}
								</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Suite</dt>
								<dd className="font-medium">{detailQuery.data.suiteCode}</dd>
							</div>
						</dl>
						{detailQuery.data.notes ? (
							<div>
								<p className="text-muted-foreground">Notes</p>
								<p className="mt-1">{detailQuery.data.notes}</p>
							</div>
						) : null}
						{eligible ? (
							<Button
								variant="accent"
								size="touch"
								render={<Link to="/request-ship" />}
							>
								Add to ship request
							</Button>
						) : null}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
