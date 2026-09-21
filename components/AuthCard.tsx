export function Gate({
  kicker,
  title,
  subtitle,
  children,
}: {
  kicker?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-2">
      <div className="flex min-h-[40vh] min-w-0 flex-col justify-end bg-ink px-8 py-12 text-cream [container-type:inline-size] md:min-h-screen md:px-12 md:py-16 lg:px-16">
        <p className="display w-full text-[clamp(2.25rem,18cqi,4.5rem)] text-cream">
          JENAFY
        </p>
        <p className="mt-4 text-[1.35rem] text-cream">Analytics</p>
        <span className="rule mt-6" />
        <p className="mt-8 max-w-sm text-[17px] leading-[1.58] text-muted-dark">
          Website analytics for properties you manage.
        </p>
      </div>
      <div className="flex min-h-[60vh] min-w-0 items-center bg-paper px-6 py-12 md:min-h-screen md:px-12 lg:px-16">
        <div className="w-full max-w-md min-w-0">
          {kicker ? <p className="label-ui text-muted">{kicker}</p> : null}
          <h1 className="display mt-4 w-full text-[clamp(2rem,5vw,3.25rem)] text-ink">
            {title}
          </h1>
          <p className="mt-4 text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

export { Gate as AuthCard };

export const authInputClass = "field";
