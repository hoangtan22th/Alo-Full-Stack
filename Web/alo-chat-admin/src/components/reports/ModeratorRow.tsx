import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ModeratorRow({ name, status, count, image, initials }: any) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10 border-none bg-surface-container-high text-on-surface-variant font-bold text-sm">
          {image && <AvatarImage src={image} className="object-cover" />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h4 className="text-sm font-bold text-on-surface">{name}</h4>
          <p className="text-xs text-on-surface-variant">{status}</p>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-primary">{count}</div>
        <div className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
          Resolved
        </div>
      </div>
    </div>
  );
}
