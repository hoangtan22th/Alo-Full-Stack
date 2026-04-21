import { Button } from "@/components/ui/button";

export function LogR({ time, event, actor, target, ip }: any) {
  return (
    <tr className="hover:bg-surface-container-low/30 transition-colors group cursor-default">
      <td className="py-4 px-6 text-on-surface-variant">{time}</td>
      <td className="py-4 px-6">
        <div className="flex items-center">
          <span className={`p-1.5 rounded-md mr-3 ${event.bg} ${event.color}`}>
            {event.icon}
          </span>
          <div>
            <div className="font-bold text-on-surface font-sans text-sm">
              {event.title}
            </div>
            <div className="text-[11px] text-on-surface-variant mt-0.5 uppercase tracking-wider">
              {event.type}
            </div>
          </div>
        </div>
      </td>
      <td className="py-4 px-6">
        <div className={`font-sans text-sm ${actor.highlight}`}>
          {actor.name}
        </div>
        <div className="text-[11px] text-on-surface-variant mt-0.5">
          {actor.type}
        </div>
      </td>
      <td className="py-4 px-6">
        <div
          className="text-on-surface font-semibold max-w-[200px] truncate"
          title={target.name}
        >
          {target.name}
        </div>
        <div className="text-[11px] text-on-surface-variant mt-0.5">
          {target.desc}
        </div>
      </td>
      <td className="py-4 px-6 text-on-surface-variant">{ip}</td>
      <td className="py-4 px-6 text-right">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs font-sans text-on-surface font-semibold border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low"
        >
          View JSON
        </Button>
      </td>
    </tr>
  );
}
