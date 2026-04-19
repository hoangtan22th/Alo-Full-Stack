import {
  UsersIcon,
  EyeIcon,
  GlobeAltIcon,
  AtSymbolIcon,
  CheckCircleIcon,
  MapPinIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";

export default function GlobalBroadcastPage() {
  return (
    <div className="flex gap-8 max-w-7xl mx-auto h-[calc(100vh-8rem)]">
      {/* Left Column: Compose */}
      <section className="w-full lg:w-[60%] flex flex-col gap-6 h-full">
        <div>
          <h2 className="text-3xl font-extrabold text-on-surface mb-2 font-headline">
            Compose Broadcast
          </h2>
          <p className="text-on-surface-variant font-medium text-sm">
            Send priority alerts or announcements to the entire network.
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-8 flex-1 flex flex-col gap-8 shadow-minimal border border-outline-variant/15 overflow-y-auto">
          {/* Audience Selection */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
              Target Audience
            </label>
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex items-center p-4 border border-outline-variant/15 rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors flex-1">
                <input
                  type="radio"
                  name="audience"
                  className="text-primary focus:ring-primary h-4 w-4 border-outline"
                  defaultChecked
                />
                <div className="ml-3">
                  <span className="block text-sm font-bold text-on-surface">
                    All Users
                  </span>
                  <span className="block text-xs text-on-surface-variant">
                    Global network
                  </span>
                </div>
              </label>
              <label className="flex items-center p-4 border border-outline-variant/15 rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors flex-1">
                <input
                  type="radio"
                  name="audience"
                  className="text-primary focus:ring-primary h-4 w-4 border-outline"
                />
                <div className="ml-3">
                  <span className="block text-sm font-bold text-on-surface">
                    Active Now
                  </span>
                  <span className="block text-xs text-on-surface-variant">
                    Currently online
                  </span>
                </div>
              </label>
              <label className="flex items-center p-4 border border-outline-variant/15 rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors flex-1">
                <input
                  type="radio"
                  name="audience"
                  className="text-primary focus:ring-primary h-4 w-4 border-outline"
                />
                <div className="ml-3">
                  <span className="block text-sm font-bold text-on-surface">
                    Region Select
                  </span>
                  <span className="block text-xs text-on-surface-variant">
                    Custom geo-fence
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Message Editor */}
          <div className="flex-1 flex flex-col min-h-[300px]">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              Message Body
            </label>
            <input
              type="text"
              placeholder="Broadcast Title..."
              className="w-full bg-surface-container-highest border-none rounded-t-lg focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest focus:outline-none p-4 text-on-surface font-semibold placeholder:text-on-surface-variant/50 mb-1"
            />
            <div className="bg-surface-container-highest border-none rounded-b-lg flex-1 flex flex-col focus-within:bg-surface-container-lowest focus-within:ring-1 focus-within:ring-primary focus-within:outline-none transition-all">
              {/* Toolbar Stub (Simplified for React Translation) */}
              <div className="flex items-center gap-2 p-2 border-b border-outline-variant/15 text-sm font-bold text-on-surface-variant">
                <span className="cursor-pointer px-2 py-1 hover:bg-surface-container-low rounded">
                  B
                </span>
                <span className="cursor-pointer px-2 py-1 hover:bg-surface-container-low rounded italic">
                  I
                </span>
                <div className="w-px h-4 bg-outline-variant/30 mx-1"></div>
                <span className="cursor-pointer px-2 py-1 hover:bg-surface-container-low rounded">
                  Link
                </span>
              </div>
              <textarea
                placeholder="Write your broadcast message here..."
                className="w-full flex-1 bg-transparent border-none focus:outline-none focus:ring-0 p-4 text-on-surface resize-none placeholder:text-on-surface-variant/50"
              ></textarea>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-6 mt-auto">
              <label className="flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
                <input
                  type="checkbox"
                  className="text-primary focus:ring-primary rounded border-outline"
                />
                <span className="font-medium">Pin to dashboard for 24h</span>
              </label>
              <Button className="bg-primary text-on-primary font-bold py-5 px-8 shadow-[inset_0_2px_0_rgba(255,255,255,0.1)] hover:bg-primary-dim transition-colors rounded-lg flex items-center gap-2">
                <PaperAirplaneIcon className="w-5 h-5 -rotate-45 -mt-1" />
                Send Broadcast
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Right Column: History */}
      <section className="w-full lg:w-[40%] flex flex-col gap-6">
        <div className="flex justify-between items-end mb-2">
          <h2 className="text-xl font-bold text-on-surface">
            Recent Broadcasts
          </h2>
          <button className="text-sm font-semibold text-primary hover:text-primary-dim transition-colors">
            View All
          </button>
        </div>

        <div className="bg-surface-container-low rounded-2xl p-6 flex-1 flex flex-col gap-4 overflow-y-auto">
          {/* History Item 1 */}
          <div className="bg-surface-container-lowest p-5 rounded-xl shadow-minimal border border-outline-variant/10">
            <div className="flex justify-between items-start mb-2">
              <span className="bg-error-container text-error text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                Critical Update
              </span>
              <span className="text-xs font-medium text-on-surface-variant">
                2 hours ago
              </span>
            </div>
            <h3 className="font-bold text-on-surface mb-1">
              Server Maintenance Notice
            </h3>
            <p className="text-sm text-on-surface-variant line-clamp-2">
              Scheduled downtime will occur tonight at 02:00 UTC. Please save
              all ongoing work.
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-on-surface-variant">
              <div className="flex items-center gap-1">
                <UsersIcon className="w-4 h-4" /> All Users
              </div>
              <div className="flex items-center gap-1">
                <EyeIcon className="w-4 h-4" /> 45.2k Read
              </div>
            </div>
          </div>

          {/* History Item 2 */}
          <div className="bg-surface-container-lowest p-5 rounded-xl shadow-minimal border border-outline-variant/10">
            <div className="flex justify-between items-start mb-2">
              <span className="bg-tertiary-container text-on-tertiary-container text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                Feature Launch
              </span>
              <span className="text-xs font-medium text-on-surface-variant">
                Yesterday
              </span>
            </div>
            <h3 className="font-bold text-on-surface mb-1">
              Introducing Dark Mode 2.0
            </h3>
            <p className="text-sm text-on-surface-variant line-clamp-2">
              You asked, we delivered. Experience the new improved dark mode
              across all devices.
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-on-surface-variant">
              <div className="flex items-center gap-1">
                <AtSymbolIcon className="w-4 h-4" /> Active Now
              </div>
              <div className="flex items-center gap-1">
                <EyeIcon className="w-4 h-4" /> 12.8k Read
              </div>
            </div>
          </div>

          {/* History Item 3 */}
          <div className="bg-surface-container-lowest p-5 rounded-xl shadow-minimal border border-outline-variant/10 opacity-80">
            <div className="flex justify-between items-start mb-2">
              <span className="bg-surface-variant text-on-surface-variant text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                General
              </span>
              <span className="text-xs font-medium text-on-surface-variant">
                Oct 12, 2023
              </span>
            </div>
            <h3 className="font-bold text-on-surface mb-1">
              New Policy Guidelines
            </h3>
            <p className="text-sm text-on-surface-variant line-clamp-2">
              Please review the updated community guidelines regarding data
              privacy.
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-on-surface-variant">
              <div className="flex items-center gap-1">
                <GlobeAltIcon className="w-4 h-4" /> Region: EU
              </div>
              <div className="flex items-center gap-1">
                <EyeIcon className="w-4 h-4" /> 8.1k Read
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
