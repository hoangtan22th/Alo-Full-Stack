import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  EyeIcon,
  PencilIcon,
  EllipsisVerticalIcon,
} from "@heroicons/react/24/outline";

export function UserRow({
  name,
  email,
  avatarUrl,
  initials,
  role,
  registration,
  lastActive,
  status,
}: any) {
  const isBanned = status === "Banned";
  const isInactive = status === "Inactive";

  // Badges status mapping perfectly mimicking the bespoke design requirement
  const statusBadge = () => {
    if (isBanned) return "bg-error-container/30 text-error";
    if (isInactive)
      return "bg-surface-container-highest text-on-surface-variant";
    return "bg-tertiary-container text-on-tertiary-container";
  };

  return (
    <tr
      className={`hover:bg-surface-container-low/30 transition-colors group ${isBanned ? "opacity-75" : ""}`}
    >
      <td className="py-4 px-6">
        <div className="flex items-center">
          <Avatar className="h-10 w-10 bg-surface-container-highest font-bold text-sm text-on-surface-variant border-none">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="ml-4">
            <div className="text-sm font-bold text-on-surface">{name}</div>
            <div className="text-xs text-on-surface-variant">{email}</div>
          </div>
        </div>
      </td>
      <td className="py-4 px-6">
        <span className="text-sm text-on-surface font-medium">{role}</span>
      </td>
      <td className="py-4 px-6 text-sm text-on-surface-variant">
        {registration}
      </td>
      <td className="py-4 px-6 text-sm text-on-surface-variant">
        {lastActive}
      </td>
      <td className="py-4 px-6">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${statusBadge()}`}
        >
          {status}
        </span>
      </td>
      <td className="py-4 px-6 text-right whitespace-nowrap">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-on-surface-variant hover:text-on-surface mx-0.5"
        >
          <EyeIcon className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-on-surface-variant hover:text-on-surface mx-0.5"
        >
          <PencilIcon className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-on-surface-variant hover:text-error mx-0.5"
        >
          <EllipsisVerticalIcon className="w-5 h-5" />
        </Button>
      </td>
    </tr>
  );
}
