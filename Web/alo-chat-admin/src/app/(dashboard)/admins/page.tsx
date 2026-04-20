"use client";

import { useEffect, useState } from "react";
import { useAdmins } from "@/hooks/useAdmins";
import { useAuthStore } from "@/store/useAuthStore";
import { useConfirmStore } from "@/store/useConfirmStore";
import {
  TrashIcon,
  PlusIcon,
  PencilIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

export default function AdminManagementPage() {
  const {
    admins,
    pagination,
    loading,
    error,
    fetchAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin,
  } = useAdmins();
  const { isSuperAdmin, checkAuth } = useAuthStore();
  const { confirm } = useConfirmStore();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editAdminId, setEditAdminId] = useState<string | null>(null);

  // New admin state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ROLE_ADMIN");

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    checkAuth();
    setIsAuthChecked(true);
  }, [checkAuth]);

  // Debounce search effect to trigger backend request
  useEffect(() => {
    if (isAuthChecked && isSuperAdmin) {
      const delayDebounceFn = setTimeout(() => {
        fetchAdmins({
          search: searchTerm,
          roleFilter: roleFilter,
          page: currentPage,
        });
      }, 500); // 500ms delay

      return () => clearTimeout(delayDebounceFn);
    }
  }, [
    isAuthChecked,
    isSuperAdmin,
    searchTerm,
    roleFilter,
    currentPage,
    fetchAdmins,
  ]);

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, roleFilter]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !role) return;

    await createAdmin({ name, email, password, role }, () => {
      setIsModalOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("ROLE_ADMIN");
    });
  };

  const openEditModal = (admin: any) => {
    setEditAdminId(admin.id);
    setName(admin.name || "");
    setEmail(admin.email || "");
    setPassword(""); // Leave empty unless modifying
    setRole(
      admin.role === "ROLE_SUPER_ADMIN" || admin.role === "SUPER_ADMIN"
        ? "ROLE_SUPER_ADMIN"
        : "ROLE_ADMIN",
    );
    setIsEditModalOpen(true);
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAdminId || !role) return;

    // Chỉ gửi password nếu người dùng có nhập
    const updatePayload: any = { name, role };
    if (password && password.trim() !== "") {
      updatePayload.password = password;
    }

    await updateAdmin(editAdminId, updatePayload, () => {
      setIsEditModalOpen(false);
      setEditAdminId(null);
      setName("");
      setEmail("");
      setPassword("");
      setRole("ROLE_ADMIN");
    });
  };

  const handleDelete = async (id: string, email: string) => {
    confirm({
      title: "Xóa Admin",
      message: `Bạn có chắc chắn muốn xóa tài khoản admin "${email}" không? Hành động này không thể hoàn tác.`,
      confirmText: "Xóa tài khoản",
      destructive: true,
      onConfirm: async () => {
        await deleteAdmin(id);
      },
    });
  };

  if (!isAuthChecked) return null; // loading state

  if (!isSuperAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface text-center">
        <ShieldCheckIcon className="w-16 h-16 text-on-surface-variant mb-4" />
        <h1 className="text-2xl font-bold text-on-surface">Access Denied</h1>
        <p className="text-on-surface-variant mt-2">
          Only Super Admins can access this page. Please contact administration
          if you need access.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
            Admin Management
          </h1>
          <p className="text-sm font-medium text-on-surface-variant mt-1">
            Manage super admins and system admins
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          <PlusIcon className="w-5 h-5" />
          Add Admin
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg my-4 border border-red-200">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search admins by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 bg-surface-container-low border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all min-w-[150px]"
        >
          <option value="ALL">All Roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-[#ebeef0] overflow-hidden">
        {loading && admins.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant animate-pulse">
            Loading admins...
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-[#ebeef0] text-sm text-on-surface-variant">
                <th className="py-3 px-6 font-semibold">Name</th>
                <th className="py-3 px-6 font-semibold">Email</th>
                <th className="py-3 px-6 font-semibold">Role</th>
                <th className="py-3 px-6 font-semibold border-l border-[#ebeef0]">
                  Created At
                </th>
                <th className="py-3 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-on-surface-variant"
                  >
                    No admins found matching your criteria.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr
                    key={admin.id}
                    className="border-b border-[#ebeef0] hover:bg-surface-container-low transition-colors group"
                  >
                    <td className="py-3 px-6 text-on-surface font-medium">
                      {admin.name}
                    </td>
                    <td className="py-3 px-6 text-on-surface-variant">
                      {admin.email}
                    </td>
                    <td className="py-3 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          admin.role === "ROLE_SUPER_ADMIN" ||
                          admin.role === "SUPER_ADMIN"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {admin.role === "ROLE_SUPER_ADMIN" ||
                        admin.role === "SUPER_ADMIN"
                          ? "Super Admin"
                          : "Admin"}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-on-surface-variant text-sm border-l border-[#ebeef0]">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-6 text-right space-x-2">
                      {admin.email !== "admin@alochat.com" && (
                        <>
                          <button
                            onClick={() => openEditModal(admin)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors invisible group-hover:visible inline-flex"
                            title="Edit Admin"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(admin.id, admin.email)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors invisible group-hover:visible inline-flex"
                            title="Delete Admin"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex justify-between flex-wrap gap-4 items-center mt-6 p-4 bg-surface-container-lowest rounded-xl border border-[#ebeef0]">
          <span className="text-sm text-on-surface-variant font-medium">
            Showing page {pagination.page + 1} of {pagination.totalPages} (
            {pagination.totalElements} total admins)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page === 0}
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-[#ebeef0] text-on-surface hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                    pagination.page === i
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              disabled={pagination.page >= pagination.totalPages - 1}
              onClick={() =>
                setCurrentPage((p) =>
                  Math.min(pagination.totalPages - 1, p + 1),
                )
              }
              className="px-3 py-1.5 text-sm font-medium rounded-lg border border-[#ebeef0] text-on-surface hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-md p-6 border border-[#ebeef0]">
            <h2 className="text-xl font-bold mb-4">Create New Admin</h2>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Admin Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                >
                  <option value="ROLE_ADMIN">Admin</option>
                  <option value="ROLE_SUPER_ADMIN">Super Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-md p-6 border border-[#ebeef0]">
            <h2 className="text-xl font-bold mb-4">Edit Admin</h2>
            <form onSubmit={handleUpdateAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Admin Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">
                  Email
                </label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-3 py-2 bg-surface-container-highest cursor-not-allowed text-on-surface-variant border border-transparent rounded-lg focus:outline-none"
                />
                <p className="text-xs text-on-surface-variant mt-1">
                  Email cannot be changed.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">
                  New Password (Optional)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Leave blank to keep current"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                >
                  <option value="ROLE_ADMIN">Admin</option>
                  <option value="ROLE_SUPER_ADMIN">Super Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditAdminId(null);
                    setPassword("");
                  }}
                  className="px-4 py-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Update Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
