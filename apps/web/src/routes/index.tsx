import { Button } from "@JaShipping/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	return (
		<div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-4 py-16">
			<p className="font-medium text-primary text-sm uppercase tracking-[0.2em]">
				JaShipping
			</p>
			<h1 className="mt-4 font-semibold text-4xl text-foreground tracking-tight sm:text-5xl">
				US receiving.
				<br />
				Jamaica delivery.
			</h1>
			<p className="mt-4 max-w-xl text-lg text-muted-foreground">
				Get your personal Miami warehouse suite, track inbound packages, and
				request forwarding home.
			</p>
			<div className="mt-8 flex flex-wrap gap-3">
				<Button variant="accent" size="touch" render={<Link to="/login" />}>
					Sign in
				</Button>
				<Button variant="outline" size="touch" render={<Link to="/address" />}>
					Go to account
				</Button>
			</div>
		</div>
	);
}
