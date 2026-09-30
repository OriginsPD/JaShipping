import { Button } from "@JaShipping/ui/components/button";
import { Input } from "@JaShipping/ui/components/input";
import { Label } from "@JaShipping/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";

export default function SignUpForm({
	onSwitchToSignIn,
}: {
	onSwitchToSignIn: () => void;
}) {
	const navigate = useNavigate();
	const { isPending } = authClient.useSession();

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
			name: "",
			marketingOptIn: false,
		},
		onSubmit: async ({ value }) => {
			await authClient.signUp.email(
				{
					email: value.email,
					password: value.password,
					name: value.name,
				},
				{
					onSuccess: () => {
						navigate({ to: "/address" });
						toast.success("Account created");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(2, "Name must be at least 2 characters"),
				email: z.email("Invalid email address"),
				password: z.string().min(8, "Password must be at least 8 characters"),
				marketingOptIn: z.boolean(),
			}),
		},
	});

	if (isPending) {
		return <Loader />;
	}

	return (
		<div className="w-full">
			<h1 className="mb-2 text-center font-semibold text-3xl text-foreground">
				Create account
			</h1>
			<p className="mb-6 text-center text-muted-foreground text-sm">
				Get your personal US receiving suite.
			</p>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-4"
			>
				<form.Field name="name">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Name</Label>
							<Input
								id={field.name}
								name={field.name}
								className="h-11"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
							{field.state.meta.errors.map((error) => (
								<p key={error?.message} className="text-destructive text-sm">
									{error?.message}
								</p>
							))}
						</div>
					)}
				</form.Field>

				<form.Field name="email">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Email</Label>
							<Input
								id={field.name}
								name={field.name}
								type="email"
								className="h-11"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
							{field.state.meta.errors.map((error) => (
								<p key={error?.message} className="text-destructive text-sm">
									{error?.message}
								</p>
							))}
						</div>
					)}
				</form.Field>

				<form.Field name="password">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor={field.name}>Password</Label>
							<Input
								id={field.name}
								name={field.name}
								type="password"
								className="h-11"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
							{field.state.meta.errors.map((error) => (
								<p key={error?.message} className="text-destructive text-sm">
									{error?.message}
								</p>
							))}
						</div>
					)}
				</form.Field>

				<form.Field name="marketingOptIn">
					{(field) => (
						<label className="flex items-start gap-3 text-muted-foreground text-sm">
							<input
								type="checkbox"
								className="mt-1 size-4 rounded border-border"
								checked={field.state.value}
								onChange={(e) => field.handleChange(e.target.checked)}
							/>
							<span>Send me product updates (optional — not pre-checked)</span>
						</label>
					)}
				</form.Field>

				<form.Subscribe
					selector={(state) => ({
						canSubmit: state.canSubmit,
						isSubmitting: state.isSubmitting,
					})}
				>
					{({ canSubmit, isSubmitting }) => (
						<Button
							type="submit"
							variant="accent"
							size="touch"
							className="w-full"
							disabled={!canSubmit || isSubmitting}
						>
							{isSubmitting ? "Creating…" : "Create account"}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<div className="mt-4 text-center">
				<Button
					variant="link"
					onClick={onSwitchToSignIn}
					className="text-primary"
				>
					Already have an account? Sign in
				</Button>
			</div>
		</div>
	);
}
