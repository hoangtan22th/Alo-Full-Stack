export function ActivityFeedItem({
  icon,
  title,
  description,
  time,
  iconBg,
}: any) {
  return (
    <div className="flex items-start gap-4 p-6 hover:bg-surface-container-low transition-colors duration-200">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="text-base font-bold text-on-surface">{title}</h4>
        <p className="text-sm font-medium text-on-surface-variant mt-1">
          {description}
        </p>
      </div>
      <div className="text-sm font-medium text-outline-variant">{time}</div>
    </div>
  );
}
