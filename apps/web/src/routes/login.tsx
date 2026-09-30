import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/login")({
	component: RouteComponent,
});

function RouteComponent() {
	const [showSignIn, setShowSignIn] = useState(true);

	return (
		<div className="min-h-full bg-background">
			<div className="mx-auto grid min-h-[calc(100svh-3.5rem)] w-full max-w-5xl lg:grid-cols-2">
				<aside className="hidden bg-primary px-10 py-16 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
					<div>
						<p className="font-medium text-accent text-sm uppercase tracking-[0.2em]">
							JaShipping
						</p>
						<h1 className="mt-6 font-semibold text-4xl leading-tight">
							Your US address.
							<br />
							Jamaica delivery.
						</h1>
						<p className="mt-4 max-w-sm text-primary-foreground/80">
							Receive packages in Miami, then request forwarding home — designed
							for clarity, not clutter.
						</p>
					</div>
					<p className="text-primary-foreground/60 text-sm">
						Dockside clarity · Phase 2 customer app
					</p>
				</aside>

				<div className="flex items-center justify-center px-4 py-10">
					<div className="w-full max-w-[420px]">
						<p className="mb-2 text-center font-medium text-primary text-sm uppercase tracking-wide lg:hidden">
							JaShipping
						</p>
						{showSignIn ? (
							<SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
						) : (
							<SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
