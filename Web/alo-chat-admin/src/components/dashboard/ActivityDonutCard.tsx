export function ActivityDonutCard() {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-minimal flex flex-col">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-on-surface">Group Activity</h3>
        <p className="text-sm font-medium text-on-surface-variant">
          Distribution by category.
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center relative">
        <div className="w-48 h-48 rounded-full border-[16px] border-surface-container-high relative">
          <div
            className="absolute inset-[-16px] rounded-full border-[16px] border-primary opacity-80"
            style={{ clipPath: "polygon(50% 0, 100% 0, 100% 100%, 50% 100%)" }}
          ></div>
          <div
            className="absolute inset-[-16px] rounded-full border-[16px] border-secondary opacity-60"
            style={{ clipPath: "polygon(0 0, 50% 0, 50% 50%, 0 50%)" }}
          ></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-on-surface">
              45.2K
            </span>
            <span className="text-xs font-medium text-on-surface-variant">
              Total
            </span>
          </div>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <LegendItem
          color="bg-primary opacity-80"
          label="Public Forums"
          value="65%"
        />
        <LegendItem
          color="bg-secondary opacity-60"
          label="Private Groups"
          value="25%"
        />
        <LegendItem
          color="bg-surface-container-high"
          label="Broadcast Channels"
          value="10%"
        />
      </div>
    </div>
  );
}

function LegendItem({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full ${color}`}></span>
        <span className="font-medium text-on-surface">{label}</span>
      </div>
      <span className="font-bold text-on-surface">{value}</span>
    </div>
  );
}
