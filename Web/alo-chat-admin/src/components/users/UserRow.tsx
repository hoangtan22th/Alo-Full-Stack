import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  EyeIcon,
  PencilIcon,
  NoSymbolIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { User } from "@/services/userService";

interface UserRowProps {
  user: User;
  onBan: () => void;
}

export function UserRow({ user, onBan }: UserRowProps) {
  const isBanned = user.isBanned;

  const statusBadge = () => {
    if (isBanned) return "bg-error-container/30 text-error";
    if (user.isOnline)
      return "bg-tertiary-container text-on-tertiary-container";
    return "bg-surface-container-highest text-on-surface-variant";
  };

  const getStatusText = () => {
    if (isBanned) return "Banned";
    if (user.isOnline) return "Online";
    return "Offline";
  };

  const formattedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : "N/A";

  const lastActiveDate = user.lastActive
    ? new Date(user.lastActive).toLocaleString()
    : "N/A";

  const initials = user.fullName
    ? user.fullName.substring(0, 2).toUpperCase()
    : "U";

  return (
    <tr
      className={`hover:bg-surface-container-low/30 transition-colors group ${isBanned ? "opacity-75" : ""}`}
    >
      <td className="py-4 px-6">
        <div className="flex items-center">
          <Avatar className="h-10 w-10 bg-surface-container-highest font-bold text-sm text-on-surface-variant border-none">
            {user.avatar && (
              <AvatarImage src={user.avatar} alt={user.fullName} />
            )}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="ml-4">
            <div className="text-sm font-bold text-on-surface">
              {user.fullName || "No Name"}
            </div>
            <div className="text-xs text-on-surface-variant">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="py-4 px-6">
        <span className="text-sm text-on-surface-variant">
          {user.phoneNumber || "N/A"}
        </span>
      </td>
      <td className="py-4 px-6 text-sm text-on-surface-variant">
        {formattedDate}
      </td>
      <td className="py-4 px-6 text-sm text-on-surface-variant">
        {lastActiveDate}
      </td>
      <td className="py-4 px-6">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${statusBadge()}`}
        >
          {getStatusText()}
        </span>
      </td>
      <td className="py-4 px-6 text-right whitespace-nowrap">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-on-surface-variant hover:text-on-surface mx-0.5"
          title="View Details"
        >
          <EyeIcon className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-on-surface-variant hover:text-on-surface mx-0.5"
          title="Edit Data"
        >
          <PencilIcon className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onBan}
          className={`h-8 w-8 mx-0.5 ${isBanned ? "text-error hover:text-error/80" : "text-on-surface-variant hover:text-error"}`}
          title={isBanned ? "Unban User" : "Ban User"}
        >
          {isBanned ? (
            <ShieldCheckIcon className="w-5 h-5" />
          ) : (
            <NoSymbolIcon className="w-5 h-5" />
          )}
        </Button>
      </td>
    </tr>
  );
}
