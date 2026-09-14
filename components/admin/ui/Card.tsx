import { cn } from "./cn";

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cn("admin-card", className)}>
      {children}
    </div>
  );
}

/** Title row of a card. `action` sits hard right, vertically centred. */
export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="admin-h3">{title}</h2>
        {description && <p className="admin-hint mt-1">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("px-5 py-5", className)}>{children}</div>;
}

/** Page-level title block, so every screen opens the same way. */
export function PageTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="admin-h1">{title}</h1>
        {description && <p className="admin-sub mt-1.5">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
