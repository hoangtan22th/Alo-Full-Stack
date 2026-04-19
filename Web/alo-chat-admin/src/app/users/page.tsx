import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  UserPlusIcon,
  ChevronDownIcon,
  EyeIcon,
  PencilIcon,
  EllipsisVerticalIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function UserManagementPage() {
  return (
    <>
      {/* Page Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-on-surface tracking-tight font-headline">
            User Management
          </h2>
          <p className="text-on-surface-variant mt-1 font-medium text-sm">
            Manage and monitor all active users across the platform.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="border-none bg-surface-container-highest text-on-surface font-semibold hover:bg-surface-container-high transition-colors"
          >
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
            Export List
          </Button>
          <Button className="bg-primary text-on-primary font-semibold hover:bg-primary-dim transition-colors shadow-[inset_0_2px_0_rgba(255,255,255,0.1)]">
            <UserPlusIcon className="w-5 h-5 mr-2" />
            Invite User
          </Button>
        </div>
      </div>

      {/* Filters Overlay */}
      <div className="bg-surface-container-low rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center border border-outline-variant/15">
        <div className="text-xs font-bold text-on-surface mr-2 tracking-wide uppercase">
          Filters
        </div>

        <div className="relative">
          <select className="appearance-none bg-surface-container-lowest border border-outline-variant/15 text-on-surface text-sm rounded-lg py-2 pl-4 pr-10 focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none cursor-pointer h-9">
            <option value="">All Roles</option>
            <option value="admin">Administrator</option>
            <option value="moderator">Moderator</option>
            <option value="user">Standard User</option>
          </select>
          <ChevronDownIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
        </div>

        <div className="relative">
          <select className="appearance-none bg-surface-container-lowest border border-outline-variant/15 text-on-surface text-sm rounded-lg py-2 pl-4 pr-10 focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none cursor-pointer h-9">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="banned">Banned</option>
          </select>
          <ChevronDownIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
        </div>

        <div className="ml-auto text-sm text-on-surface-variant font-medium">
          Showing <span className="text-on-surface font-bold">1-10</span> of{" "}
          <span className="text-on-surface font-bold">2,451</span> users
        </div>
      </div>

      {/* Data Table Card */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 overflow-hidden shadow-minimal">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="py-4 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  User
                </th>
                <th className="py-4 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Role
                </th>
                <th className="py-4 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Registration
                </th>
                <th className="py-4 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Last Active
                </th>
                <th className="py-4 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Status
                </th>
                <th className="py-4 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              <UserRow
                name="Sarah Jenkins"
                email="sarah.j@example.com"
                avatarUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuCdXM2WN5vVVcirSgHhJD2-WNq2_jPMo5GkQtZSXQbjUYsDSn0gcyYI6oYS_dQ7O99SzdRG1RmGxmwH_dn9X3YyUzwF86M_eb3_FThw3yVf0FYpWVAox1-d6yEovPe6MdM73bXGTAhzfuqSAkaDFtbmQHnLGJJPhT9w2KFGRL4trfVrqLkXhZ8XHcHqTft_5GpaVuCpDZpng2fKLuwUFeokhboNjKQz7LA7YqiCVQDljPmNe74RmCRowa1B6INTM8PhWWM6PCszM8zS"
                initials="SJ"
                role="Administrator"
                registration="Oct 24, 2023"
                lastActive="2 hours ago"
                status="Active"
              />
              <UserRow
                name="Marcus Webb"
                email="m.webb@example.com"
                initials="MW"
                role="Moderator"
                registration="Nov 12, 2023"
                lastActive="5 mins ago"
                status="Active"
              />
              <UserRow
                name="David Chen"
                email="david.c@example.com"
                avatarUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuBT0aSy9Po_1WlUnYuSeZDfafMZO-m550OAx9-E_gox-ieGxA-SQ503v5sucAzYV6kPJ8jjSYf1m-qWrMreeOcsFLA3dHCiLwuNvjmPhN04fekg-Lfk3ctQj0vwmZxsPbKgIv_zlj-VxA23afmE8PyWyB8oAj-VYV-wX0K8dQ4j1fc-PdH7Boe5elyl7AB9R4XhGB7Q0OglWhvRZimesji9R71NO51M6bgZonm-woIhOdxXNZR-MFed4bko4GCpQXH1wiNsDDUegUln"
                initials="DC"
                role="Standard User"
                registration="Jan 05, 2024"
                lastActive="3 days ago"
                status="Inactive"
              />
              <UserRow
                name="Elena Lopez"
                email="e.lopez@example.com"
                initials="EL"
                role="Standard User"
                registration="Feb 18, 2024"
                lastActive="1 week ago"
                status="Banned"
              />
            </tbody>
          </table>
        </div>

        {/* Pagination Wrapper */}
        <div className="bg-surface-container-low/50 border-t border-outline-variant/10 px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            disabled
            className="text-sm font-medium text-on-surface-variant hover:text-on-surface"
          >
            <ChevronLeftIcon className="w-5 h-5 mr-1" />
            Previous
          </Button>

          <div className="flex space-x-1">
            <Button
              variant="outline"
              className="h-8 w-8 p-0 bg-surface-container-lowest border-outline-variant/20 text-on-surface font-bold"
            >
              1
            </Button>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface font-medium"
            >
              2
            </Button>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface font-medium"
            >
              3
            </Button>
            <span className="h-8 w-8 flex items-center justify-center text-on-surface-variant">
              ...
            </span>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface font-medium"
            >
              24
            </Button>
          </div>

          <Button
            variant="ghost"
            className="text-sm font-medium text-on-surface-variant hover:text-on-surface"
          >
            Next
            <ChevronRightIcon className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>
    </>
  );
}

function UserRow({
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
