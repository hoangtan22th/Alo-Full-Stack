import {
  ChatBubbleLeftRightIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowRightIcon,
  FunnelIcon,
  PlusCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GroupRow } from "@/components/groups/GroupRow";

export default function GroupManagementPage() {
  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col space-y-2 mb-8">
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight font-headline">
          Group Management
        </h1>
        <p className="text-on-surface-variant font-medium text-sm">
          Monitor and moderate user-created channels and communities.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Groups */}
        <div className="bg-surface-container-lowest rounded-xl p-6 relative overflow-hidden shadow-minimal">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Total Groups
            </span>
            <ChatBubbleLeftRightIcon className="w-5 h-5 text-outline-variant" />
          </div>
          <div className="text-4xl font-extrabold text-on-surface">12,483</div>
          <div className="mt-2 text-sm text-on-surface-variant flex items-center">
            <ArrowTrendingUpIcon className="w-4 h-4 text-[#4b525f] mr-1" />
            <span className="font-semibold text-[#4b525f]">+4.2%</span>{" "}
            <span className="ml-1 opacity-70">from last month</span>
          </div>
        </div>

        {/* Created Today */}
        <div className="bg-surface-container-lowest rounded-xl p-6 relative overflow-hidden shadow-minimal">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Created Today
            </span>
            <PlusCircleIcon className="w-5 h-5 text-outline-variant" />
          </div>
          <div className="text-4xl font-extrabold text-on-surface">142</div>
          <div className="mt-2 text-sm text-on-surface-variant flex items-center">
            <ArrowTrendingDownIcon className="w-4 h-4 text-error mr-1" />
            <span className="font-semibold text-error">-1.5%</span>{" "}
            <span className="ml-1 opacity-70">from yesterday</span>
          </div>
        </div>

        {/* Avg Members */}
        <div className="bg-surface-container-lowest rounded-xl p-6 relative overflow-hidden shadow-minimal">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Avg Members
            </span>
            <UsersIcon className="w-5 h-5 text-outline-variant" />
          </div>
          <div className="text-4xl font-extrabold text-on-surface">48</div>
          <div className="mt-2 text-sm text-on-surface-variant flex items-center">
            <ArrowRightIcon className="w-4 h-4 text-[#4b525f] mr-1" />
            <span className="font-semibold text-[#4b525f]">0.0%</span>{" "}
            <span className="ml-1 opacity-70">steady</span>
          </div>
        </div>
      </div>

      {/* Data Table Container */}
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden flex flex-col shadow-minimal border-none">
        <div className="p-6 pb-4 flex justify-between items-center bg-surface-container-lowest">
          <h2 className="text-lg font-bold text-on-surface">Active Groups</h2>
          <Button
            variant="secondary"
            className="bg-surface-container-highest hover:bg-surface-variant text-on-surface rounded-lg text-sm font-semibold transition-colors"
          >
            <FunnelIcon className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider font-semibold">
                <th className="py-4 px-6 font-semibold">Group</th>
                <th className="py-4 px-6 font-semibold">Owner</th>
                <th className="py-4 px-6 font-semibold">Members</th>
                <th className="py-4 px-6 font-semibold">Created</th>
                <th className="py-4 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-outline-variant/10">
              <GroupRow
                name="UI/UX Design Sync"
                id="G-8921"
                visibility="Public"
                image="https://lh3.googleusercontent.com/aida-public/AB6AXuDpDOszIxNn39Y9AfNmnKAkzWag2pqbIeQ7nf3lBo6DbsPw4_cPvosZ5yrU9wfPDkMY4xUCs9vaol0trHEMpPgrE_hl1u1HAyTUaKcu2KyVTWHhlZQnIQssZtCn9bLONCm3hja4E7y8E42zcjDifk6JfIXmkKZOIQLKBZPALdiMZFFOPi32cTuNm3wHXuWDcgOcCbWBz88N8aDHoYLTymAg5CjvR2tetv1VggK3Rc-AZ4x98h5JCHkASkPRcKCaPv2rHUAG8jBxHmoo"
                initials="UX"
                ownerName="Sarah Jenkins"
                ownerImage="https://lh3.googleusercontent.com/aida-public/AB6AXuDHONYyCsLnRtnTimtaXw4yYex5DSujGIGa8ww8fIqFHZMUD1--RLbiHHleg2SNdxJYbsY7-RfHizSU2j4nfs_Hp9neP-lnZ5JkH2rl6C9cE0-RbTmvF4Ph0Urspe98_OXSqp9rlQVrFJjXEgvUn2PRzDufNe7bM1IpbN0t3aesnSlv8vP536poGAhRW8Y7zz-bbVp07GCie1n2m7VsYz3OI9FSpT4XkocN1cN2lfn7YUp62xXQBJCg7TRYB3QDr2ATO2KjOHeR4w8R"
                members="124"
                created="Oct 12, 2023"
              />
              <GroupRow
                name="Engineering All-Hands"
                id="G-1042"
                visibility="Private"
                initials="E"
                ownerName="Michael Chen"
                ownerImage="https://lh3.googleusercontent.com/aida-public/AB6AXuA1RK4kTv1JgEIeRq2LIR0WbE_KM-CjrKKEoGKeXjfJIc51gZqoE3pPp0X6mFmEOAg7CEgpJW3yj4B2fQ_V8mTHWCv9GRq_IG5I6gPi4KBdaBlQR8fhYUq_-2snHYo99v7W3_WJLPAvaTjvKMo8UsJfvzN396KVzxMTljTtWlVxEH_UrSk2nSqIj5RYlBDrLnVY0vFeBzDWSLAIEa5Uv0JKHN_VNhoyKo-wOJuQJeDMFZZPnQt8R6n_qBYfYnoV8u5LYvD5OHbxltIU"
                members="382"
                created="Sep 01, 2023"
              />
              <GroupRow
                name="Weekend Gamers"
                id="G-5521"
                visibility="Public"
                image="https://lh3.googleusercontent.com/aida-public/AB6AXuBuDoD7kBjz4gnaohb7cjWc9ysWBEEgYaSgTuhpHGO1X1m_9AvcvFu19HUbKZIrOPfnaBnJpo0quElXs9DbvQAVUWh28eKW9a0eSWZtQsAk0Mp6T5SzQNgbiPQIcIMbUr5Bk6tL29FfvggXrvdpmpGwN218TgaRpiIVsS5c775mDiue2ij_yjOq-e_IHZYBvisr1_7mqR3qVzE7v5SqoyGH8mkq2qQHXhNxJWMdRbp9MBVljpVB-r-CzpvIa6d-7LMYhNkZHUggBNFl"
                initials="WG"
                ownerName="Emily Ross"
                ownerImage="https://lh3.googleusercontent.com/aida-public/AB6AXuB5ScOdz6OD0GKtDufvLl0QIhJ3MVe5bv5AVIuWKB0jgNLUIooN0AVJw7jW4aFeMbQVg7la9wT5QCrrQKmFgf6WMYsZgEm-pogFEj3RJlPTIP7EtmmB7EO1bi27kX4ZLjUglvfV-abYL_jaqz29yJ3yOjckayW43-Sx_1iw_d-qbxDDq5s6Q6i3mRF_qkPOM-1EozXC4yxCnQmqKS1MOSdhWOPgGNMSl24h-2RVRrOrqj5MFFKwam_F0_yVGPzl4OL8Sm0nnvov15td"
                members="1,204"
                created="Nov 22, 2023"
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
