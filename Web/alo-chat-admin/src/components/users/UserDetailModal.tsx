import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { User } from "@/services/userService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CalendarIcon,
  EnvelopeIcon,
  PhoneIcon,
  ClockIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

export function UserDetailModal({
  user,
  isOpen,
  onClose,
}: {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!user) return null;

  const initials = user.fullName
    ? user.fullName.substring(0, 2).toUpperCase()
    : "U";

  const getStatusText = () => {
    if (user.isBanned) return "Banned";
    if (user.isOnline) return "Online";
    return "Offline";
  };

  const statusBadge = () => {
    if (user.isBanned)
      return "bg-error-container/30 text-error border-error/50";
    if (user.isOnline)
      return "bg-tertiary-container text-on-tertiary-container border-tertiary/50";
    return "bg-surface-container-highest text-on-surface-variant border-outline-variant/30";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-surface-container-lowest border-outline-variant/20 p-0 overflow-hidden rounded-2xl w-[90vw]">
        {/* Cover Photo */}
        <div className="h-32 bg-primary/20 relative">
          {/* Fallback pattern / could show an actual cover_url if mapped from backend */}
        </div>

        {/* Profile Head */}
        <div className="px-6 flex flex-col sm:flex-row items-center sm:items-end -mt-12 sm:-mt-16 sm:space-x-5">
          <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-surface-container-lowest bg-surface-container-highest shadow-sm">
            {user.avatar && (
              <AvatarImage src={user.avatar} alt={user.fullName} />
            )}
            <AvatarFallback className="text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="mt-4 sm:mt-0 flex-1 text-center sm:text-left pb-2 flex flex-col sm:flex-row sm:justify-between items-center sm:items-end">
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight text-on-surface">
                {user.fullName || "No Name Provided"}
              </DialogTitle>
              <div className="text-on-surface-variant text-sm mt-1">
                User ID: <span className="font-mono text-xs">{user.id}</span>
              </div>
            </div>
            <div className="mt-3 sm:mt-0">
              <span
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${statusBadge()}`}
              >
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/70 border-b border-outline-variant/20 pb-2">
              Contact Information
            </h3>
            <div className="flex flex-wrap sm:flex-nowrap items-center text-sm gap-3">
              <EnvelopeIcon className="w-5 h-5 text-primary/70 shrink-0" />
              <span className="text-on-surface font-medium break-all">
                {user.email || "N/A"}
              </span>
            </div>
            <div className="flex items-center text-sm gap-3">
              <PhoneIcon className="w-5 h-5 text-primary/70 shrink-0" />
              <span className="text-on-surface font-medium">
                {user.phoneNumber || "N/A"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/70 border-b border-outline-variant/20 pb-2">
              Account Details
            </h3>
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-primary/70" />
              <div className="text-sm flex flex-col">
                <span className="text-on-surface-variant text-xs">
                  Registered On
                </span>
                <span className="text-on-surface font-medium">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ClockIcon className="w-5 h-5 text-primary/70" />
              <div className="text-sm flex flex-col">
                <span className="text-on-surface-variant text-xs">
                  Last Active
                </span>
                <span className="text-on-surface font-medium">
                  {user.lastActive
                    ? new Date(user.lastActive).toLocaleString()
                    : "System Not Tracking"}
                </span>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant/70 border-b border-outline-variant/20 pb-2">
              Biography & Profile
            </h3>
            <div className="flex items-start gap-3 bg-surface-container-low p-4 rounded-xl">
              <InformationCircleIcon className="w-5 h-5 text-on-surface-variant shrink-0 mt-0.5" />
              <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
                {user.bio || "This user hasn't provided a biography yet."}
              </p>
            </div>

            <div className="flex gap-6 mt-4">
              <div>
                <span className="text-xs text-on-surface-variant block mb-1">
                  Gender
                </span>
                <span className="text-sm font-medium text-on-surface capitalize">
                  {user.gender ? String(user.gender).toLowerCase() : "Unknown"}
                </span>
              </div>
              <div>
                <span className="text-xs text-on-surface-variant block mb-1">
                  Date of Birth
                </span>
                <span className="text-sm font-medium text-on-surface">
                  {user.dateOfBirth
                    ? new Date(user.dateOfBirth).toLocaleDateString()
                    : "Unknown"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
