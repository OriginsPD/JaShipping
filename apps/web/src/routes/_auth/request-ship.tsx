import { Button } from "@JaShipping/ui/components/button";
import { Checkbox } from "@JaShipping/ui/components/checkbox";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@JaShipping/ui/components/empty";
import { Input } from "@JaShipping/ui/components/input";
import { Label } from "@JaShipping/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/request-ship")({
	component: RequestShipPage,
});

const destinationSchema = z.object({
	destFullName: z.string().min(1, "Name required"),
	destLine1: z.string().min(1, "Address required"),
	destLine2: z.string(),
	destCity: z.string().min(1, "City required"),
	destParish: z.string().min(1, "Parish required"),
	destPostalCode: z.string(),
	destPhone: z.string(),
});

function RequestShipPage() {
	const trpc = useTRPC();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [step, setStep] = useState<1 | 2 | 3>(1);
	const [selected, setSelected] = useState<string[]>([]);

	const shippableQuery = useQuery(trpc.packages.shippable.queryOptions());
	const requestMutation = useMutation(
		trpc.shipments.requestToShip.mutationOptions({
			onSuccess: async () => {
				toast.success("Ship request submitted");
				await queryClient.invalidateQueries();
				navigate({ to: "/packages" });
			},
			onError: (error) => {
				toast.error(error.message);
			},
		}),
	);

	const form = useForm({
		defaultValues: {
			destFullName: "",
			destLine1: "",
			destLine2: "",
			destCity: "",
			destParish: "",
			destPostalCode: "",
			destPhone: "",
		},
		validators: {
			onSubmit: destinationSchema,
		},
		onSubmit: async ({ value }) => {
			await requestMutation.mutateAsync({
				packageIds: selected,
				destination: {
					...value,
					destLine2: value.destLine2 || undefined,
					destPostalCode: value.destPostalCode || undefined,
					destPhone: value.destPhone || undefined,
				},
			});
		},
	});

	const selectedPackages = useMemo(
		() =>
			(shippableQuery.data ?? []).filter((pkg) => selected.includes(pkg.id)),
		[selected, shippableQuery.data],
	);

	function togglePackage(id: string) {
		setSelected((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	}

	if (shippableQuery.isLoading) {
		return <div className="p-8 text-muted-foreground">Loading packages…</div>;
	}

	if ((shippableQuery.data ?? []).length === 0) {
		return (
			<div className="mx-auto max-w-2xl px-4 py-8">
				<Empty className="border border-border border-dashed">
					<EmptyHeader>
						<EmptyTitle>Nothing ready to ship</EmptyTitle>
						<EmptyDescription>
							Packages must be received or ready before you can request Jamaica
							delivery.
						</EmptyDescription>
					</EmptyHeader>
					<Button
						variant="outline"
						size="touch"
						render={<Link to="/packages" />}
					>
						Back to packages
					</Button>
				</Empty>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-2xl px-4 py-8">
			<p className="font-medium text-primary text-sm uppercase tracking-wide">
				JaShipping
			</p>
			<h1 className="mt-1 font-semibold text-3xl">Request ship</h1>
			<p className="mt-2 text-muted-foreground">
				Step {step} of 3 — consolidate packages to Jamaica.
			</p>

			{step === 1 ? (
				<div className="mt-6 space-y-4">
					<ul className="divide-y divide-border rounded-[var(--radius)] border border-border bg-card">
						{(shippableQuery.data ?? []).map((pkg) => {
							const checked = selected.includes(pkg.id);
							return (
								<li key={pkg.id} className="flex items-center gap-3 px-4 py-3">
									<Checkbox
										checked={checked}
										onCheckedChange={() => togglePackage(pkg.id)}
										aria-label={`Select ${pkg.description || pkg.id}`}
									/>
									<div className="min-w-0">
										<p className="font-medium">
											{pkg.description || pkg.trackingNumber || pkg.id}
										</p>
										<p className="text-muted-foreground text-sm">
											{pkg.status.replaceAll("_", " ")}
										</p>
									</div>
								</li>
							);
						})}
					</ul>
					<Button
						variant="accent"
						size="touch"
						disabled={selected.length === 0}
						onClick={() => setStep(2)}
					>
						Continue
					</Button>
				</div>
			) : null}

			{step === 2 ? (
				<form
					className="mt-6 space-y-4"
					onSubmit={(e) => {
						e.preventDefault();
						setStep(3);
					}}
				>
					{(
						[
							["destFullName", "Full name"],
							["destLine1", "Address line 1"],
							["destLine2", "Address line 2 (optional)"],
							["destCity", "City"],
							["destParish", "Parish"],
							["destPostalCode", "Postal code (optional)"],
							["destPhone", "Phone (optional)"],
						] as const
					).map(([name, label]) => (
						<form.Field key={name} name={name}>
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>{label}</Label>
									<Input
										id={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
								</div>
							)}
						</form.Field>
					))}
					<p className="text-muted-foreground text-sm">Country: Jamaica (JM)</p>
					<div className="flex flex-wrap gap-3">
						<Button
							type="button"
							variant="outline"
							size="touch"
							onClick={() => setStep(1)}
						>
							Back
						</Button>
						<Button type="submit" variant="accent" size="touch">
							Review
						</Button>
					</div>
				</form>
			) : null}

			{step === 3 ? (
				<div className="mt-6 space-y-4">
					<div className="rounded-[var(--radius)] border border-border bg-card p-4">
						<h2 className="font-medium">
							Packages ({selectedPackages.length})
						</h2>
						<ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
							{selectedPackages.map((pkg) => (
								<li key={pkg.id}>
									{pkg.description || pkg.trackingNumber || pkg.id}
								</li>
							))}
						</ul>
						<h2 className="mt-4 font-medium">Jamaica destination</h2>
						<p className="mt-1 whitespace-pre-line text-sm">
							{[
								form.state.values.destFullName,
								form.state.values.destLine1,
								form.state.values.destLine2,
								`${form.state.values.destCity}, ${form.state.values.destParish}`,
								form.state.values.destPostalCode,
								"Jamaica",
								form.state.values.destPhone,
							]
								.filter(Boolean)
								.join("\n")}
						</p>
						<p className="mt-4 rounded-[var(--radius)] bg-muted px-3 py-2 font-medium text-sm">
							Fees: UNVERIFIED — amounts pending board approval
						</p>
					</div>
					<div className="flex flex-wrap gap-3">
						<Button
							type="button"
							variant="outline"
							size="touch"
							onClick={() => setStep(2)}
						>
							Back
						</Button>
						<Button
							variant="accent"
							size="touch"
							disabled={requestMutation.isPending}
							onClick={() => form.handleSubmit()}
						>
							{requestMutation.isPending ? "Submitting…" : "Confirm request"}
						</Button>
					</div>
				</div>
			) : null}
		</div>
	);
}
