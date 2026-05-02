"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdmins } from "@/hooks/useAdmins";
import { useAuthStore } from "@/store/useAuthStore";
import { useConfirmStore } from "@/store/useConfirmStore";
import {
  TrashIcon,
  PlusIcon,
  PencilIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { Pagination } from "@/components/ui/Pagination";
import { AdminFormModal } from "@/components/admins/AdminFormModal";

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
  const router = useRouter();
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

  // UI states for form
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    setFieldErrors({});
    if (!name || !email || !password || !role) return;

    const res = await createAdmin({ name, email, password, role }, () => {
      setIsModalOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("ROLE_ADMIN");
      setFieldErrors({});
      setShowPassword(false);
    });

    if (res && !res.success && res.fieldErrors) {
      setFieldErrors(res.fieldErrors);
    }
  };

  const openEditModal = (admin: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
  }) => {
    setEditAdminId(admin.id);
    setName(admin.name || "");
    setEmail(admin.email || "");
    setPassword(""); // Leave empty unless modifying
    setRole(
      admin.role === "ROLE_SUPER_ADMIN" || admin.role === "SUPER_ADMIN"
        ? "ROLE_SUPER_ADMIN"
        : "ROLE_ADMIN",
    );
    setFieldErrors({});
    setShowPassword(false);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id: string, email: string) => {
    confirm({
      title: "Xóa Admin",
      message: `B?n có ch?c ch?n mu?n xóa tài kho?n admin "${email}" không? Hành d?ng này không th? hoàn tác.`,
      confirmText: "Xóa tài kho?n",
      destructive: true,
      onConfirm: async () => {
        await deleteAdmin(id);
      },
    });
  };

  if (!isAuthChecked) return null; // loading state

  // Strict Route Guarding: Redirect if not super admin
  if (!isSuperAdmin) {
    if (typeof window !== "undefined") {
      router.replace("/");
    }
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface text-center">
        <ShieldCheckIcon className="w-16 h-16 text-on-surface-variant mb-4" />
        <h1 className="text-2xl font-bold text-on-surface">Access Denied</h1>
        <p className="text-on-surface-variant mt-2">
          Redirecting to dashboard...
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
      <div className="bg-surface-container-low rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center border border-outline-variant/15">
        <div className="text-xs font-bold text-on-surface mr-2 tracking-wide uppercase">
          Filters
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search admins by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-surface-container-lowest border border-outline-variant/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-surface-container-lowest border border-outline-variant/15 rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary focus:border-primary min-w-[150px]"
        >
          <option value="ALL">All Roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Admin</option>
        </select>

        <button
          onClick={() => {
            setSearchTerm("");
            setRoleFilter("ALL");
            setCurrentPage(0);
            // If any of these didn't change, manually trigger fetch
            if (searchTerm === "" && roleFilter === "ALL" && currentPage === 0) {
              fetchAdmins({ search: "", roleFilter: "ALL", page: 0 });
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
              : pagination.page * 10 + 1}
            -
            {Math.min(
              (pagination.page + 1) * 10,
              pagination.totalElements,
            )}
          </span>{" "}
          of{" "}
          <span className="text-on-surface font-bold">
            {pagination.totalElements}
          </span>{" "}
          admins
        </div>
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
                            className="h-8 w-8 items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low mx-0.5 rounded-md transition-colors inline-flex"
                            title="Edit Admin"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(admin.id, admin.email)}
                            className="h-8 w-8 items-center justify-center text-on-surface-variant hover:text-red-500 hover:bg-red-50 mx-0.5 rounded-md transition-colors inline-flex"
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
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalElements={pagination.totalElements}
        onPageChange={setCurrentPage}
        loading={loading}
      />

      {/* Modals */}
      {isModalOpen && (
        <AdminFormModal
          mode="create"
          fieldErrors={fieldErrors}
          loading={loading}
          onSubmit={({ name, email, password, role }) => {
            // we set states here so that handleCreateAdmin can use them, or we modify handleCreateAdmin to take params
            // simpler to just call createAdmin here
            setFieldErrors({});
            createAdmin(
              {
                name,
                email,
                password,
                role: role as "ROLE_ADMIN" | "ROLE_SUPER_ADMIN",
              },
              () => {
                setIsModalOpen(false);
                setFieldErrors({});
              },
            ).then(
              (
                res: {
                  success: boolean;
                  fieldErrors?: Record<string, string>;
                } | void,
              ) => {
                if (res && !res.success && res.fieldErrors)
                  setFieldErrors(res.fieldErrors);
              },
            );
          }}
          onCancel={() => {
            setIsModalOpen(false);
            setFieldErrors({});
          }}
        />
      )}

      {isEditModalOpen && (
        <AdminFormModal
          mode="edit"
          initialData={{ name, email, role }}
          fieldErrors={fieldErrors}
          loading={loading}
          onSubmit={({ name, role, password }) => {
            setFieldErrors({});
            if (!editAdminId) return;
            const updatePayload: {
              name: string;
              role: string;
              password?: string;
            } = { name, role };
            if (password && password.trim() !== "")
              updatePayload.password = password;
            updateAdmin(editAdminId, updatePayload, () => {
              setIsEditModalOpen(false);
              setEditAdminId(null);
              setFieldErrors({});
            }).then(
              (
                res: {
                  success: boolean;
                  fieldErrors?: Record<string, string>;
                } | void,
              ) => {
                if (res && !res.success && res.fieldErrors)
                  setFieldErrors(res.fieldErrors);
              },
            );
          }}
          onCancel={() => {
            setIsEditModalOpen(false);
            setEditAdminId(null);
            setFieldErrors({});
          }}
        />
      )}
    </div>
  );
}


