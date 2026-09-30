import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/utils/trpc";
import UserMenu from "./user-menu";

export default function Header() {
	const { data: session } = authClient.useSession();
	const trpc = useTRPC();
	const meQuery = useQuery({
		...trpc.address.me.queryOptions(),
		enabled: Boolean(session?.user),
	});

	const role = meQuery.data?.role;
	const isOps = role === "staff" || role === "admin";

	const customerLinks = [
		{ to: "/address" as const, label: "US Address" },
		{ to: "/packages" as const, label: "Packages" },
		{ to: "/request-ship" as const, label: "Request ship" },
	];

	if (isOps) {
		return (
			<header className="border-sidebar-border border-b bg-sidebar text-sidebar-foreground">
				<div className="mx-auto flex max-w-6xl flex-row items-center justify-between gap-4 px-4 py-3">
					<div className="flex items-center gap-6">
						<Link
							to="/staff/receive"
							className="font-semibold text-lg tracking-tight"
						>
							JaShipping Ops
						</Link>
						<nav className="hidden gap-4 text-sm sm:flex">
							<Link
								to="/staff/receive"
								className="text-sidebar-foreground/80 transition-colors hover:text-sidebar-foreground"
								activeProps={{
									className: "font-semibold text-sidebar-primary",
								}}
							>
								Receive
							</Link>
							<Link
								to="/staff/ship"
								className="text-sidebar-foreground/80 transition-colors hover:text-sidebar-foreground"
								activeProps={{
									className: "font-semibold text-sidebar-primary",
								}}
							>
								Ship
							</Link>
							{role === "admin" ? (
								<Link
									to="/staff/admin"
									className="text-sidebar-foreground/80 transition-colors hover:text-sidebar-foreground"
									activeProps={{
										className: "font-semibold text-sidebar-primary",
									}}
								>
									Admin
								</Link>
							) : null}
							<Link
								to="/packages"
								className="text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground"
							>
								Customer view
							</Link>
						</nav>
					</div>
					<div className="flex items-center gap-3">
						<span className="hidden text-sidebar-foreground/80 text-sm sm:inline">
							{role === "admin" ? "Admin" : "Staff"} · {session?.user.name}
						</span>
						<UserMenu />
					</div>
				</div>
			</header>
		);
	}

	return (
		<header className="border-border border-b bg-card">
			<div className="mx-auto flex max-w-5xl flex-row items-center justify-between gap-4 px-4 py-3">
				<div className="flex items-center gap-6">
					<Link
						to="/"
						className="font-semibold text-lg text-primary tracking-tight"
					>
						JaShipping
					</Link>
					<nav className="hidden gap-4 text-sm sm:flex">
						{customerLinks.map(({ to, label }) => (
							<Link
								key={to}
								to={to}
								className="text-muted-foreground transition-colors hover:text-foreground"
								activeProps={{ className: "font-medium text-foreground" }}
							>
								{label}
							</Link>
						))}
					</nav>
				</div>
				<UserMenu />
			</div>
		</header>
	);
}
