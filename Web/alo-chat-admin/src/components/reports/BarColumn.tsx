export function BarColumn({
  day,
  b1,
  b2,
}: {
  day: string;
  b1: string;
  b2: string;
}) {
  return (
    <div className="flex-1 flex flex-col justify-end gap-1 relative group cursor-pointer">
      <div
        className="w-full bg-secondary-container rounded-t-sm transition-colors group-hover:bg-tertiary-container"
        style={{ height: b1 }}
      ></div>
      <div
        className="w-full bg-primary rounded-t-sm transition-colors group-hover:bg-primary-dim"
        style={{ height: b2 }}
      ></div>
      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-on-surface-variant font-medium">
        {day}
      </span>
    </div>
  );
}
