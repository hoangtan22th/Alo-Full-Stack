import {
  CheckCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
  MagnifyingGlassIcon,
  BellIcon,
  UserCircleIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  ChatBubbleLeftEllipsisIcon,
  PresentationChartLineIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { ReportRow } from "@/components/reports/ReportRow";
import { ModeratorRow } from "@/components/reports/ModeratorRow";
import { BarColumn } from "@/components/reports/BarColumn";

export default function ReportsModerationPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2 font-headline">
          Reports &amp; Moderation
        </h1>
        <p className="text-on-surface-variant text-base">
          Monitor platform safety, review flagged content, and manage user
          restrictions.
        </p>
      </div>

      {/* Top Row: Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Stat Card 1 */}
        <div className="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-minimal relative overflow-hidden group border border-outline-variant/10">
          <div className="absolute top-0 left-0 w-full h-1 bg-error"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider text-label-md">
              Total Pending
            </h3>
            <PresentationChartLineIcon className="w-8 h-8 text-error bg-error-container/20 p-1.5 rounded-full" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-on-surface font-headline">
              24
            </span>
            <span className="text-xs font-medium text-error flex items-center bg-error-container/20 px-2 py-0.5 rounded-full">
              <ArrowTrendingUpIcon className="w-3.5 h-3.5 mr-1" />
              +5 today
            </span>
          </div>
        </div>

        {/* Stat Card 2 */}
        <div className="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-minimal relative overflow-hidden group border border-outline-variant/10">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider text-label-md">
              Resolved Today
            </h3>
            <CheckCircleIcon className="w-8 h-8 text-primary bg-primary-container/20 p-1.5 rounded-full" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-on-surface font-headline">
              142
            </span>
            <span className="text-xs font-medium text-secondary flex items-center">
              On track
            </span>
          </div>
        </div>

        {/* Stat Card 3 */}
        <div className="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-minimal relative overflow-hidden group border border-outline-variant/10">
          <div className="absolute top-0 left-0 w-full h-1 bg-secondary"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider text-label-md">
              Avg. Response
            </h3>
            <ClockIcon className="w-8 h-8 text-secondary bg-secondary-container/30 p-1.5 rounded-full" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-on-surface font-headline">
              12m
            </span>
            <span className="text-xs font-medium text-tertiary flex items-center">
              -2m vs yesterday
            </span>
          </div>
        </div>

        {/* Stat Card 4 */}
        <div className="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-minimal relative overflow-hidden group border border-outline-variant/10">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider text-label-md">
              Accuracy
            </h3>
            <ShieldCheckIcon className="w-8 h-8 text-primary bg-primary-container/20 p-1.5 rounded-full" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-on-surface font-headline">
              98.5%
            </span>
            <span className="text-xs font-medium text-secondary flex items-center">
              Peer reviewed
            </span>
          </div>
        </div>
      </div>

      {/* Middle Row: Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Bar Chart (Visual Fake) */}
        <div className="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-minimal border border-outline-variant/10 lg:col-span-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-xl font-bold text-on-surface font-headline">
              System Traffic &amp; Moderation Actions
            </h2>
            <select className="bg-surface-container-low border-none rounded-lg text-sm text-on-surface-variant py-1.5 pl-3 pr-8 focus:ring-1 focus:ring-primary outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>

          <div className="h-64 flex items-end gap-2 mt-4 px-2">
            {/* Simulated Bar Chart Columns */}
            <BarColumn day="Mon" b1="40%" b2="60%" />
            <BarColumn day="Tue" b1="50%" b2="45%" />
            <BarColumn day="Wed" b1="30%" b2="80%" />
            <BarColumn day="Thu" b1="60%" b2="55%" />
            <BarColumn day="Fri" b1="80%" b2="40%" />
            <BarColumn day="Sat" b1="20%" b2="30%" />
            <BarColumn day="Sun" b1="25%" b2="20%" />
          </div>

          <div className="flex items-center gap-6 mt-8 justify-center">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary"></span>
              <span className="text-sm text-on-surface-variant font-medium">
                Auto-Resolved
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-secondary-container"></span>
              <span className="text-sm text-on-surface-variant font-medium">
                Manual Review
              </span>
            </div>
          </div>
        </div>

        {/* Moderator Activity List */}
        <div className="bg-surface-container-lowest rounded-[1.5rem] p-6 shadow-minimal border border-outline-variant/10 lg:col-span-1 flex flex-col">
          <h2 className="text-xl font-bold text-on-surface font-headline mb-6">
            Moderator Activity
          </h2>
          <div className="flex-1 space-y-4">
            <ModeratorRow
              name="Sarah Jenkins"
              status="Active now"
              count={64}
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuDS8QvuFKgEJhqf8TxSe3HkOu7syUGYvS0tuVhnWL9ATihmkq7iRGwWOEhyKgSjpV8z1PHNSrwua5zXibez40Hlmfs8JJa5k7wNy29Ejl2cnK6E_Fo4BMsLr-g8BOygQCfNTbeGBzFMuQcxwap9_OFdiqEC3y2LJtlIiYvvrYkeTo98qrIIY7I73HgEQ36_JnmBMyB9sk2_LdaJ0D71TCW52egspc4GXTnT-L8OSGLXg26Q5tA7xPs0LY_i88j0pY2GTyLtXfx-J7Mv"
              initials="SJ"
            />
            <ModeratorRow
              name="Marcus Chen"
              status="Active now"
              count={52}
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuAoYCsM3edQns2QwQzr24SLm3z20yV364vFJD4lEM7fN_S7q6ZzHQGey57KsCOeU5a4CqKHQUcyJjWr8DA8JrkByJ3W2J8m1KuzBpBnIbhdqbMs0ybnYfqB65_QUsKtebXtGL3QhKWauZe_wN5IF6wpjUsde-mD7j-rfi3UzyAUDURjL0DbMWQfisoC2JFF6hfpI_yoT6WsZHZ-CmPN2ITrUv2bro95QUPgP7ZKt0mP6fzVueEK6s9GTxfk_RsDC0UOxcbkZCmCA6kg"
              initials="MC"
            />
            <ModeratorRow
              name="Elena Rodriguez"
              status="Away 2h"
              count={28}
              initials="EL"
            />
            <ModeratorRow
              name="David Kim"
              status="Offline"
              count={14}
              initials="DK"
            />
          </div>
          <Button
            variant="ghost"
            className="w-full mt-4 text-primary font-bold hover:bg-primary/10"
          >
            View All Staff
          </Button>
        </div>
      </div>

      {/* Reports Queue */}
      <div className="bg-surface-container-lowest rounded-[1.5rem] shadow-minimal border border-outline-variant/10 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/15 flex items-center justify-between">
          <h2 className="text-xl font-bold text-on-surface font-headline">
            Pending Queue{" "}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold"
            >
              Filter
            </Button>
            <Button
              size="sm"
              className="bg-primary text-on-primary text-xs font-semibold hover:bg-primary-dim"
            >
              Auto-Assign
            </Button>
          </div>
        </div>

        <div className="divide-y divide-outline-variant/10">
          <ReportRow
            type="Harassment"
            target="User Profile"
            time="10 mins ago"
            severity="High"
            reporter="User-8921"
          />
          <ReportRow
            type="Spam"
            target="Group Chat #41"
            time="25 mins ago"
            severity="Medium"
            reporter="System Auto"
          />
          <ReportRow
            type="Scam"
            target="Direct Message"
            time="1 hour ago"
            severity="Critical"
            reporter="User-1042"
          />
        </div>
      </div>
    </>
  );
}
