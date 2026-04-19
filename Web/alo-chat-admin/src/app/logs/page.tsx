import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  ComputerDesktopIcon,
  KeyIcon,
  UserCircleIcon,
  ExclamationCircleIcon,
  DocumentDuplicateIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/logs/FilterSelect";
import { LogR } from "@/components/logs/LogR";

export default function SystemLogsPage() {
  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight font-headline">
            System Logs &amp; Audit
          </h1>
          <p className="text-on-surface-variant mt-2 font-medium text-sm">
            Comprehensive audit trail of administrator actions and critical
            system events.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-none bg-surface-container-highest text-on-surface font-semibold hover:bg-surface-container-high transition-colors"
          >
            <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
            Export CSV
          </Button>
          <Button className="bg-primary text-on-primary font-semibold hover:bg-primary-dim transition-colors shadow-[inset_0_2px_0_rgba(255,255,255,0.1)]">
            <ArrowPathIcon className="w-5 h-5 mr-2" />
            Refresh Stream
          </Button>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-2 mb-6 flex flex-wrap lg:flex-nowrap gap-2 items-center shadow-minimal">
        <div className="relative flex-1 min-w-[250px]">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search by ID, User, or Event..."
            className="w-full bg-surface-container border-none text-on-surface text-sm rounded-xl py-3 pl-12 pr-4 focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest focus:outline-none transition-all placeholder:text-on-surface-variant/70 font-medium"
          />
        </div>

        <div className="w-px h-8 bg-outline-variant/20 hidden lg:block mx-1"></div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2 min-w-max">
          <FilterSelect
            icon={
              <ClockIcon className="w-4 h-4 mr-2 text-on-surface-variant" />
            }
            defaultValue="Last 24 Hours"
          />
          <FilterSelect
            icon={
              <UserCircleIcon className="w-4 h-4 mr-2 text-on-surface-variant" />
            }
            defaultValue="All Actors"
          />
          <FilterSelect
            icon={
              <ComputerDesktopIcon className="w-4 h-4 mr-2 text-on-surface-variant" />
            }
            defaultValue="All Categories"
          />
          <FilterSelect
            icon={
              <ExclamationCircleIcon className="w-4 h-4 mr-2 text-on-surface-variant" />
            }
            defaultValue="Severity: Any"
          />
        </div>
      </div>

      {/* Logs Data Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 overflow-hidden shadow-minimal">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-surface-container-low/50 border-b border-outline-variant/10">
                <th className="py-4 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-wider min-w-[140px]">
                  Timestamp (UTC)
                </th>
                <th className="py-4 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-wider min-w-[180px]">
                  Event / Action
                </th>
                <th className="py-4 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-wider min-w-[120px]">
                  Actor
                </th>
                <th className="py-4 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-wider min-w-[150px]">
                  Target Resource
                </th>
                <th className="py-4 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-wider min-w-[120px]">
                  IP Address
                </th>
                <th className="py-4 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-right">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 font-mono text-[13px]">
              {/* Row 1: High Severity */}
              <LogR
                time="2023-10-24 14:02:11"
                event={{
                  title: "Authentication Bypass Attempt",
                  type: "Security",
                  color: "text-error",
                  bg: "bg-error/10",
                  icon: <ExclamationCircleIcon className="w-4 h-4" />,
                }}
                actor={{
                  name: "System",
                  type: "Automated",
                  highlight: "text-on-surface-variant",
                }}
                target={{
                  name: "Admin_Login_Portal",
                  desc: "Endpoint: /api/v1/auth/admin",
                }}
                ip="192.168.1.105"
              />

              {/* Row 2: Info Severity */}
              <LogR
                time="2023-10-24 13:45:00"
                event={{
                  title: "Global Broadcast Sent",
                  type: "Communication",
                  color: "text-primary",
                  bg: "bg-primary/10",
                  icon: <DocumentDuplicateIcon className="w-4 h-4" />,
                }}
                actor={{
                  name: "Sarah Jenkins",
                  type: "Admin-ID: 9912",
                  highlight: "text-primary font-bold",
                }}
                target={{ name: "All_Active_Users", desc: "Count: 45,210" }}
                ip="10.0.0.42"
              />

              {/* Row 3: Warning Severity */}
              <LogR
                time="2023-10-24 12:15:33"
                event={{
                  title: "User Role Modified",
                  type: "Access Control",
                  color: "text-tertiary",
                  bg: "bg-tertiary/10",
                  icon: <KeyIcon className="w-4 h-4" />,
                }}
                actor={{
                  name: "Marcus Webb",
                  type: "SuperAdmin-ID: 0001",
                  highlight: "text-tertiary font-bold",
                }}
                target={{
                  name: "User-8812 (David C)",
                  desc: "Old: User | New: Moderator",
                }}
                ip="10.0.0.18"
              />

              {/* Row 4: Info Severity */}
              <LogR
                time="2023-10-24 11:00:05"
                event={{
                  title: "Group Disbanded",
                  type: "Moderation",
                  color: "text-on-surface",
                  bg: "bg-surface-container-highest",
                  icon: (
                    <ExclamationCircleIcon className="w-4 h-4 text-on-surface-variant" />
                  ),
                }}
                actor={{
                  name: "Sarah Jenkins",
                  type: "Admin-ID: 9912",
                  highlight: "text-primary font-bold",
                }}
                target={{
                  name: "Group-5521 (Weekend G...)",
                  desc: "Reason: ToS Violation",
                }}
                ip="10.0.0.42"
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
