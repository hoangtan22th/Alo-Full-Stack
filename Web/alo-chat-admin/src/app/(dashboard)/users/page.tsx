"use client";

import { useEffect, useState } from "react";
import { useUsers } from "@/hooks/useUsers";
import { useConfirmStore } from "@/store/useConfirmStore";
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  UserPlusIcon,
  ChevronDownIcon,
  NoSymbolIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { UserRow } from "@/components/users/UserRow";
import { UserDetailModal } from "@/components/users/UserDetailModal";
import { Pagination } from "@/components/ui/Pagination";
import { toast } from "sonner";
import { User } from "@/services/userService";

export default function UserManagementPage() {
  const {
    users,
    pagination,
    loading,
    error,
    fetchUsers,
    banUser,
    unbanUser,
    updateUser,
  } = useUsers();
  const { confirm } = useConfirmStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(0); // Reset page on new search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadData = () => {
    fetchUsers({
      page: currentPage,
      size: pageSize,
      search: debouncedSearch || undefined,
      status: activeStatus !== "ALL" ? activeStatus : undefined,
    });
  };

  useEffect(() => {
    loadData();
  }, [currentPage, debouncedSearch, activeStatus, fetchUsers]);

  const handleBanToggle = (id: string, currentStatus: boolean) => {
    if (currentStatus) {
      confirm({
        title: "Unban User",
        description:
          "Are you sure you want to unban this user? They will be able to log in again.",
        confirmText: "Unban User",
        cancelText: "Cancel",
        type: "info",
        onConfirm: () => unbanUser(id),
      });
      return;
    }
    confirm({
      title: "Ban User",
      description:
        "Are you sure you want to ban this user? They will not be able to log in anymore.",
      confirmText: "Ban User",
      cancelText: "Cancel",
      type: "danger",
      onConfirm: () => banUser(id),
    });
  };

  return (
    <>
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
            placeholder="Search by name, email or phone..."
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
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                activeStatus === status
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

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
          users
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 overflow-hidden shadow-minimal">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="py-4 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  User
                </th>
                <th className="py-4 px-6 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Phone
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
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-on-surface-variant"
                  >
                    <div className="animate-pulse">Loading users...</div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-on-surface-variant"
                  >
                    No users found matching your criteria.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onBan={() => handleBanToggle(user.id, user.isBanned)}
                    onView={() => {
                      setSelectedUser(user);
                      setIsDetailOpen(true);
                    }}
                  />
                ))
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

      <UserDetailModal
        user={selectedUser}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </>
  );
}
