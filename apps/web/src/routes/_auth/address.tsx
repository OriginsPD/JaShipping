import { Button } from "@JaShipping/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@JaShipping/ui/components/card";
import { Skeleton } from "@JaShipping/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/address")({
	component: AddressPage,
});

function AddressPage() {
	const trpc = useTRPC();
	const addressQuery = useQuery(trpc.address.myUsAddress.queryOptions());

	async function copyAddress() {
		if (!addressQuery.data?.copyText) return;
		try {
			await navigator.clipboard.writeText(addressQuery.data.copyText);
			toast.success("Address copied");
		} catch {
			toast.error("Could not copy address");
		}
	}

	return (
		<div className="mx-auto w-full max-w-2xl px-4 py-8">
			<div className="mb-6">
				<p className="font-medium text-primary text-sm uppercase tracking-wide">
					JaShipping
				</p>
				<h1 className="mt-1 font-semibold text-3xl text-foreground">
					Your US address
				</h1>
				<p className="mt-2 text-muted-foreground">
					Ship purchases to this warehouse address. Include your suite on every
					label.
				</p>
			</div>

			{addressQuery.isLoading ? (
				<Skeleton className="h-64 w-full rounded-[var(--radius)]" />
			) : addressQuery.isError || !addressQuery.data ? (
				<Card>
					<CardHeader>
						<CardTitle>Address unavailable</CardTitle>
						<CardDescription>
							We could not load your suite. Refresh or try again shortly.
						</CardDescription>
					</CardHeader>
				</Card>
			) : (
				<Card className="border-border bg-card shadow-none">
					<CardHeader>
						<CardTitle className="text-xl">
							Assigned warehouse address
						</CardTitle>
						<CardDescription>
							Suite{" "}
							<span className="font-semibold text-foreground">
								{addressQuery.data.suiteCode}
							</span>
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="whitespace-pre-line rounded-[var(--radius)] bg-muted/60 p-4 font-mono text-foreground text-sm leading-relaxed">
							{addressQuery.data.formattedLines.join("\n")}
						</div>
						<Button
							variant="accent"
							size="touch"
							className="w-full sm:w-auto"
							onClick={copyAddress}
						>
							Copy address
						</Button>
						<div className="flex flex-wrap gap-3 pt-2">
							<Button
								variant="outline"
								size="touch"
								render={<Link to="/packages" />}
							>
								View packages
							</Button>
							<Button
								variant="ghost"
								size="touch"
								render={<Link to="/request-ship" />}
							>
								Request ship
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
