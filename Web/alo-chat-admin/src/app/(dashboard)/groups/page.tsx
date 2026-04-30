"use client";

import { useEffect, useState } from "react";
import { useGroups } from "@/hooks/useGroups";
import { useConfirmStore } from "@/store/useConfirmStore";
import {
  ChatBubbleLeftRightIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowRightIcon,
  FunnelIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
  NoSymbolIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GroupRow } from "@/components/groups/GroupRow";
import { Pagination } from "@/components/ui/Pagination";

export default function GroupManagementPage() {
  const {
    groups,
    stats,
    pagination,
    loading,
    error,
    fetchGroups,
    fetchGroupStats,
    toggleBanGroup,
  } = useGroups();
  const { confirm } = useConfirmStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(0);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadData = () => {
    fetchGroups({
      page: currentPage,
      size: pageSize,
      name: debouncedSearch || undefined,
      isBanned: activeStatus,
      isGroup: true, // we only care about real groups, not direct chats
    });
  };

  useEffect(() => {
    loadData();
    fetchGroupStats();
  }, [
    currentPage,
    debouncedSearch,
    activeStatus,
    fetchGroups,
    fetchGroupStats,
  ]);

  const handleBanToggle = (id: string, currentStatus: boolean) => {
    if (currentStatus) {
      confirm({
        title: "Unban Group",
        description:
          "Are you sure you want to unban this group? Members will be able to access it again.",
        confirmText: "Unban Group",
        cancelText: "Cancel",
        type: "info",
        onConfirm: () => toggleBanGroup(id, false),
      });
      return;
    }
    confirm({
      title: "Ban Group",
      description:
        "Are you sure you want to ban this group? It will no longer be active.",
      confirmText: "Ban Group",
      cancelText: "Cancel",
      type: "danger",
      onConfirm: () => toggleBanGroup(id, true),
    });
  };

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
          <div className="text-4xl font-extrabold text-on-surface">
            {stats?.totalGroups !== undefined
              ? stats.totalGroups.toLocaleString()
              : "-"}
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
          <div className="text-4xl font-extrabold text-on-surface">
            {stats?.createdToday !== undefined
              ? stats.createdToday.toLocaleString()
              : "-"}
          </div>
          <div className="mt-2 text-sm text-on-surface-variant flex items-center">
            {stats?.createdTodayTrend !== undefined &&
              stats.createdTodayTrend > 0 ? (
              <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-600 mr-1" />
            ) : stats?.createdTodayTrend !== undefined &&
              stats.createdTodayTrend < 0 ? (
              <ArrowTrendingDownIcon className="w-4 h-4 text-error mr-1" />
            ) : (
              <ArrowRightIcon className="w-4 h-4 text-[#4b525f] mr-1" />
            )}
            <span
              className={`font-semibold ${stats?.createdTodayTrend !== undefined &&
                  stats.createdTodayTrend > 0
                  ? "text-emerald-600"
                  : stats?.createdTodayTrend !== undefined &&
                    stats.createdTodayTrend < 0
                    ? "text-error"
                    : "text-[#4b525f]"
                }`}
            >
              {stats?.createdTodayTrend !== undefined
                ? `${stats.createdTodayTrend > 0 ? "+" : ""}${stats.createdTodayTrend}%`
                : "0%"}
            </span>{" "}
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
          <div className="text-4xl font-extrabold text-on-surface">
            {stats?.avgMembers !== undefined ? stats.avgMembers : "-"}
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-surface-container-low rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center border border-outline-variant/15">
        <div className="text-xs font-bold text-on-surface mr-2 tracking-wide uppercase">
          Filters
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-on-surface-variant" />
          </div>
          <input
            type="text"
            placeholder="Search by ID or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-surface-container-lowest border border-outline-variant/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
        </div>

        <div className="flex bg-surface-container-lowest rounded-lg border border-outline-variant/15 p-1">
          {["ALL", "ACTIVE", "BANNED"].map((status) => (
            <button
              key={status}
              onClick={() => {
                setActiveStatus(status);
                setCurrentPage(0);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeStatus === status
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
                }`}
            >
              {status}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setSearchTerm("");
            setActiveStatus("ALL");
            setCurrentPage(0);
            if (searchTerm === "" && activeStatus === "ALL" && currentPage === 0) {
              loadData();
              fetchGroupStats();
            }
          }}
          className="p-2 bg-surface-container-lowest border border-outline-variant/15 rounded-lg text-on-surface-variant hover:text-primary hover:border-primary transition-all shadow-sm"
          title="Reset & Refresh"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>

        <div className="ml-auto text-sm text-on-surface-variant font-medium">
          Showing{" "}
          <span className="text-on-surface font-bold">
            {pagination.totalElements === 0
              ? 0
              : pagination.page * pageSize + 1}
            -
            {Math.min(
              (pagination.page + 1) * pageSize,
              pagination.totalElements,
            )}
          </span>{" "}
          of{" "}
          <span className="text-on-surface font-bold">
            {pagination.totalElements}
          </span>{" "}
          groups
        </div>
      </div>

      {/* Data Table Container */}
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden flex flex-col shadow-minimal border-none">

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wider font-semibold">
                <th className="py-4 px-6 font-semibold">Group</th>
                <th className="py-4 px-6 font-semibold">Owner</th>
                <th className="py-4 px-6 font-semibold">Members</th>
                <th className="py-4 px-6 font-semibold">Last Msg / Created</th>
                <th className="py-4 px-6 font-semibold">Status</th>
                <th className="py-4 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-outline-variant/10">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-on-surface-variant"
                  >
                    <div className="animate-pulse">Loading groups...</div>
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-on-surface-variant"
                  >
                    No groups found matching your criteria.
                  </td>
                </tr>
              ) : (
                groups.map((group) => {
                  const owner =
                    group.members.find((m) => m.role === "LEADER") ||
                    group.members[0];
                  const ownerId = owner?.userId || "Unknown";
                  // the frontend usually uses `GroupRow` component if available, let's fix the schema for group row
                  // we can inject direct JSX to support Ban actions here
                  return (
                    <tr
                      key={group._id}
                      className="hover:bg-surface-container-low/30 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-outline-variant/20 rounded-xl">
                            <AvatarImage
                              src={group.groupAvatar}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold rounded-xl rounded-tl-sm">
                              {group.name?.substring(0, 2).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-on-surface">
                              {group.name}
                            </div>
                            <div className="text-xs text-on-surface-variant line-clamp-1">
                              {group._id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm font-semibold text-on-surface">
                          {ownerId}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-on-surface font-medium">
                        {group.members?.length || 0}
                      </td>
                      <td className="py-4 px-6 text-on-surface-variant">
                        {new Date(
                          group.lastMessageAt || group.createdAt,
                        ).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${group.isBanned
                              ? "bg-error-container/30 text-error"
                              : "bg-tertiary-container text-on-tertiary-container"
                            }`}
                        >
                          {group.isBanned ? "Banned" : "Active"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={group.isBanned ? "Unban Group" : "Ban Group"}
                          className={`h-8 w-8 mx-0.5 ${group.isBanned
                              ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                              : "text-error hover:text-error hover:bg-error-container/50"
                            }`}
                          onClick={() =>
                            handleBanToggle(group._id, group.isBanned)
                          }
                        >
                          {group.isBanned ? (
                            <ShieldCheckIcon className="w-5 h-5" />
                          ) : (
                            <NoSymbolIcon className="w-5 h-5" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalElements={pagination.totalElements}
          onPageChange={setCurrentPage}
        />
      </div>
    </>
  );
}
