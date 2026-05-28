"use client";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { User } from "@/services/userService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CalendarIcon,
  EnvelopeIcon,
  PhoneIcon,
  ClockIcon,
  InformationCircleIcon,
  IdentificationIcon,
  UserIcon,
  ShieldCheckIcon,
  NoSymbolIcon,
  CakeIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";

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
    if (user.isBanned) return "Account Banned";
    if (user.isOnline) return "Currently Online";
    return "Offline";
  };

  const statusBadge = () => {
    if (user.isBanned)
      return "bg-error/10 text-error border-error/20";
    if (user.isOnline)
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    return "bg-surface-container-high text-on-surface-variant border-outline-variant/20";
  };

  const defaultCover = "https://btl-alo-chat.s3.ap-southeast-1.amazonaws.com/alo_cover_images/default-cover-img.jpg";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl bg-surface-container-lowest border-outline-variant/20 p-0 overflow-hidden rounded-3xl w-[95vw] shadow-2xl">
        <div className="relative h-48 md:h-64 w-full">
          {/* Cover Photo */}
          <div className="absolute inset-0 bg-surface-container-high">
            <img
              src={user.coverImage || defaultCover}
              alt="Cover"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/80 to-transparent" />
          </div>

          {/* Avatar and Main Info Overlay */}
          <div className="absolute -bottom-16 left-8 flex items-end gap-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-br from-primary to-tertiary rounded-full opacity-70 blur-sm group-hover:opacity-100 transition-opacity" />
              <Avatar className="h-32 w-32 md:h-40 md:w-40 bg-surface-container-lowest border-4 border-surface-container-lowest shadow-xl ring-1 ring-outline-variant/20">
                {user.avatar && (
                  <AvatarImage src={user.avatar} alt={user.fullName} className="object-cover" />
                )}
                <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute bottom-3 right-3 h-6 w-6 rounded-full border-4 border-surface-container-lowest shadow-lg ${user.isOnline ? 'bg-emerald-500' : 'bg-surface-container-highest'}`} />
            </div>

            <div className="pb-4 hidden md:block">
              <h2 className="text-3xl font-black text-on-surface tracking-tight drop-shadow-sm">
                {user.fullName}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-3 py-0.5 rounded-full text-xs font-bold border ${statusBadge()}`}>
                  {getStatusText()}
                </span>
                <span className="text-sm font-medium text-on-surface-variant/80 bg-surface-container-low px-2 py-0.5 rounded-lg border border-outline-variant/10">
                  ID: {user.id}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-20 pb-8 px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Basic Info Cards */}
          <div className="space-y-4">
            <div className="md:hidden mb-6">
              <h2 className="text-2xl font-black text-on-surface tracking-tight">
                {user.fullName}
              </h2>
              <p className="text-sm text-on-surface-variant font-medium mt-1">@{user.email.split('@')[0]}</p>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 flex items-center gap-2">
                <IdentificationIcon className="w-4 h-4" />
                Contact Info
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-on-surface">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <EnvelopeIcon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant leading-none mb-1">Email</span>
                    <span className="text-sm font-bold truncate max-w-[180px]">{user.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-on-surface">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <PhoneIcon className="w-4 h-4 text-secondary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant leading-none mb-1">Phone Number</span>
                    <span className="text-sm font-bold">{user.phoneNumber || "Not provided"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                System Data
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Joined Date</span>
                  <span className="text-sm font-bold text-on-surface">
                    {user.createdAt ? format(new Date(user.createdAt), "MMM dd, yyyy") : "N/A"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Last Active</span>
                  <span className="text-sm font-bold text-on-surface">
                    {user.lastActive ? format(new Date(user.lastActive), "HH:mm, MMM dd") : "Never"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Columns: Bio and Details */}
          <div className="md:col-span-2 space-y-6">
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20 pb-2 mb-4 flex items-center gap-2">
                <InformationCircleIcon className="w-4 h-4" />
                Biography
              </h3>
              <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 relative overflow-hidden">
                <p className="text-base text-on-surface leading-relaxed relative z-10 italic">
                  "{user.bio || "This user prefers to keep their life a mystery. No biography provided yet."}"
                </p>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20 pb-2 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  Personal Profile
                </h3>

                <div className="grid grid-cols-2 gap-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">Gender</span>
                    <div className="flex items-center gap-2">
                      <HeartIcon className="w-4 h-4 text-error" />
                      <span className="text-sm font-bold text-on-surface capitalize">{String(user.gender || "Secret").toLowerCase()}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">Birthday</span>
                    <div className="flex items-center gap-2">
                      <CakeIcon className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-bold text-on-surface">
                        {user.dateOfBirth ? format(new Date(user.dateOfBirth), "MMM dd, yyyy") : "Secret"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20 pb-2 flex items-center gap-2">
                  <ShieldCheckIcon className="w-4 h-4" />
                  Account Security
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl border border-outline-variant/10">
                    <div className="flex items-center gap-3">
                      {user.isBanned ? <NoSymbolIcon className="w-5 h-5 text-error" /> : <ShieldCheckIcon className="w-5 h-5 text-emerald-500" />}
                      <span className="text-sm font-bold text-on-surface">Account Status</span>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${user.isBanned ? 'bg-error text-on-error' : 'bg-emerald-500 text-white'}`}>
                      {user.isBanned ? 'Restricted' : 'Healthy'}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
