import { Button } from "@/components/ui/button";
import { ExclamationTriangleIcon, FlagIcon } from "@heroicons/react/24/outline";

export function ReportRow({ type, target, time, severity, reporter }: any) {
  const badgeColor = () => {
    if (severity === "Critical" || severity === "High")
      return "text-error bg-error-container";
    if (severity === "Medium") return "text-tertiary bg-tertiary-container";
    return "text-secondary bg-secondary-container";
  };

  return (
    <div className="p-6 hover:bg-surface-container-lowest/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-4">
        {severity === "High" || severity === "Critical" ? (
          <ExclamationTriangleIcon className="w-8 h-8 text-error p-1 bg-error/10 rounded-full" />
        ) : (
          <FlagIcon className="w-8 h-8 text-tertiary p-1 bg-tertiary/10 rounded-full" />
        )}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h4 className="text-sm font-bold text-on-surface">{type}</h4>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeColor()}`}
            >
              {severity}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant font-medium">
            Reported in {target} • {time} • By:{" "}
            <span className="text-on-surface underline decoration-outline-variant/30 cursor-pointer">
              {reporter}
            </span>
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs font-semibold border-outline-variant text-on-surface-variant hover:text-on-surface"
        >
          Decline
        </Button>
        <Button
          size="sm"
          className="bg-surface-container-highest text-on-surface text-xs font-bold hover:bg-surface-variant"
        >
          Review Case
        </Button>
      </div>
    </div>
  );
}
