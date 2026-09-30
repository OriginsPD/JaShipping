import { cn } from "@JaShipping/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
	"inline-flex items-center whitespace-nowrap rounded-[var(--radius)] border px-2.5 py-0.5 font-medium text-xs",
	{
		variants: {
			variant: {
				default: "border-transparent bg-primary text-primary-foreground",
				secondary: "border-transparent bg-secondary text-secondary-foreground",
				outline: "border-border text-foreground",
				success: "border-transparent bg-success text-success-foreground",
				warning: "border-transparent bg-accent text-accent-foreground",
				destructive: "border-transparent bg-destructive/15 text-destructive",
			},
		},
		defaultVariants: {
			variant: "secondary",
		},
	},
);

function Badge({
	className,
	variant,
	...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
	return (
		<span
			data-slot="badge"
			className={cn(badgeVariants({ variant }), className)}
			{...props}
		/>
	);
}

export { Badge, badgeVariants };
