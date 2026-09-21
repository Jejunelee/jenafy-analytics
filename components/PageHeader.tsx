export function PageHeader({
  title,
  subtitle,
  kicker,
  actions,
}: {
  title: string;
  subtitle?: string;
  kicker?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {kicker ? <p className="label-ui mb-3 text-muted">{kicker}</p> : null}
        <h1 className="display w-full text-[clamp(2rem,4.5vw,3.25rem)] text-ink">
          {title}
        </h1>
        {subtitle ? <p className="mt-4 max-w-xl text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="min-w-0 lg:max-w-[36rem]">{actions}</div> : null}
    </div>
  );
}
