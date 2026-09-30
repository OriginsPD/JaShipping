import { Badge } from "@JaShipping/ui/components/badge";
import { Button } from "@JaShipping/ui/components/button";
import { Input } from "@JaShipping/ui/components/input";
import { Label } from "@JaShipping/ui/components/label";
import { Textarea } from "@JaShipping/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/staff/receive")({
	component: StaffReceivePage,
});

function StaffReceivePage() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const [trackingNumber, setTrackingNumber] = useState("");
	const [carrier, setCarrier] = useState("");
	const [weightLbs, setWeightLbs] = useState("");
	const [suiteQuery, setSuiteQuery] = useState("");
	const [notes, setNotes] = useState("");
	const [linkedPackageId, setLinkedPackageId] = useState<string | null>(null);
	const [createNew, setCreateNew] = useState(false);
	const [suiteSubmitted, setSuiteSubmitted] = useState("");

	const matchQuery = useQuery({
		...trpc.staff.matchSuite.queryOptions({ query: suiteSubmitted }),
		enabled: suiteSubmitted.length > 0,
	});

	const receiveMutation = useMutation(
		trpc.staff.receivePackage.mutationOptions({
			onSuccess: async () => {
				toast.success("Package marked received");
				setTrackingNumber("");
				setCarrier("");
				setWeightLbs("");
				setNotes("");
				setLinkedPackageId(null);
				setCreateNew(false);
				await queryClient.invalidateQueries();
			},
			onError: (error) => {
				toast.error(error.message);
			},
		}),
	);

	const match = matchQuery.data?.match ?? null;
	const canMarkReceived = Boolean(
		match &&
			(linkedPackageId || createNew) &&
			trackingNumber &&
			carrier &&
			weightLbs,
	);

	const matchLabel = useMemo(() => {
		if (!suiteSubmitted) return null;
		if (matchQuery.isLoading) return "Looking up suite…";
		if (!match) return "No customer matched that suite";
		return null;
	}, [match, matchQuery.isLoading, suiteSubmitted]);

	function runMatch() {
		const q = suiteQuery.trim();
		if (!q) return;
		setSuiteSubmitted(q);
		setLinkedPackageId(null);
		setCreateNew(false);
	}

	return (
		<div className="mx-auto w-full max-w-6xl px-4 py-8">
			<p className="font-medium text-primary text-sm uppercase tracking-wide">
				JaShipping Ops
			</p>
			<h1 className="mt-1 font-semibold text-3xl">Receive inbound package</h1>
			<p className="mt-2 max-w-2xl text-muted-foreground">
				Scan or enter tracking, match customer suite, confirm weight. Mark
				received stays disabled until a suite match and link/create choice.
			</p>

			<div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
				<section className="rounded-[var(--radius)] border border-border bg-card p-6">
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="tracking">Tracking number</Label>
							<Input
								id="tracking"
								value={trackingNumber}
								onChange={(e) => setTrackingNumber(e.target.value)}
								placeholder="Scan or paste tracking"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="carrier">Carrier</Label>
							<Input
								id="carrier"
								value={carrier}
								onChange={(e) => setCarrier(e.target.value)}
								placeholder="UPS"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="weight">Weight (lb)</Label>
							<Input
								id="weight"
								value={weightLbs}
								onChange={(e) => setWeightLbs(e.target.value)}
								placeholder="2.40"
								className="max-w-xs"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="suite">Customer suite / name</Label>
							<div className="flex flex-col gap-2 sm:flex-row">
								<Input
									id="suite"
									value={suiteQuery}
									onChange={(e) => setSuiteQuery(e.target.value)}
									placeholder="JS-A1B2C3 · Customer name"
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											runMatch();
										}
									}}
								/>
								<Button
									type="button"
									variant="outline"
									size="touch"
									onClick={runMatch}
								>
									Match
								</Button>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="notes">Notes</Label>
							<Textarea
								id="notes"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Optional condition notes"
							/>
						</div>
						<Button
							variant="default"
							size="touch"
							disabled={!canMarkReceived || receiveMutation.isPending}
							onClick={() => {
								if (!match) return;
								receiveMutation.mutate({
									trackingNumber,
									carrier,
									weightLbs,
									notes: notes || undefined,
									suiteCode: match.suiteCode,
									packageId: linkedPackageId ?? undefined,
									createNew: createNew || undefined,
								});
							}}
						>
							{receiveMutation.isPending ? "Saving…" : "Mark received"}
						</Button>
					</div>
				</section>

				<section className="rounded-[var(--radius)] border border-border bg-card p-6">
					<h2 className="font-semibold text-lg">Matched customer</h2>
					{matchLabel ? (
						<p className="mt-4 text-muted-foreground text-sm">{matchLabel}</p>
					) : null}
					{!suiteSubmitted ? (
						<p className="mt-4 text-muted-foreground text-sm">
							Enter a suite code and click Match to resolve the customer.
						</p>
					) : null}
					{match ? (
						<div className="mt-4 space-y-4">
							<Badge variant="success">High confidence</Badge>
							<div>
								<p className="font-semibold text-xl">{match.name}</p>
								<p className="mt-1 font-medium text-primary">
									Suite {match.suiteCode}
								</p>
								<p className="mt-2 text-muted-foreground text-sm">
									Pending inbound: {match.pendingInboundCount} expected package
									{match.pendingInboundCount === 1 ? "" : "s"}
								</p>
							</div>
							{match.expectedPackages.length > 0 ? (
								<div>
									<p className="font-medium text-sm">Expected match</p>
									<ul className="mt-2 space-y-2">
										{match.expectedPackages.map((pkg) => (
											<li
												key={pkg.id}
												className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] bg-muted px-3 py-2 text-sm"
											>
												<span>
													{pkg.description || pkg.trackingNumber || pkg.id}
												</span>
												<Button
													size="sm"
													variant={
														linkedPackageId === pkg.id ? "accent" : "outline"
													}
													onClick={() => {
														setLinkedPackageId(pkg.id);
														setCreateNew(false);
													}}
												>
													{linkedPackageId === pkg.id
														? "Linked"
														: `Link to ${pkg.id.slice(0, 8)}`}
												</Button>
											</li>
										))}
									</ul>
								</div>
							) : (
								<p className="text-muted-foreground text-sm">
									No expected packages — create a new received package.
								</p>
							)}
							<Button
								variant={createNew ? "accent" : "outline"}
								size="touch"
								onClick={() => {
									setCreateNew(true);
									setLinkedPackageId(null);
								}}
							>
								Create new package
							</Button>
						</div>
					) : null}
				</section>
			</div>
		</div>
	);
}
