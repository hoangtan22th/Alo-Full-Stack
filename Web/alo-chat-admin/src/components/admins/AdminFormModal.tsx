import React, { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

interface AdminFormModalProps {
  mode: "create" | "edit";
  initialData?: {
    name?: string;
    email?: string;
    role?: string;
  };
  fieldErrors: Record<string, string>;
  loading: boolean;
  onSubmit: (data: {
    name: string;
    email: string;
    password?: string;
    role: string;
  }) => void;
  onCancel: () => void;
}

export function AdminFormModal({
  mode,
  initialData,
  fieldErrors,
  loading,
  onSubmit,
  onCancel,
}: AdminFormModalProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(initialData?.role || "ROLE_ADMIN");
  const [showPassword, setShowPassword] = useState(false);

  // Xử lý lỗi từ backend - gom lỗi email nếu backend trả về chung 1 lỗi bọc ngoài liên quan email
  const emailError =
    fieldErrors.email || fieldErrors.generic?.toLowerCase().includes("email")
      ? fieldErrors.generic
      : undefined;

  // Lọc lỗi generic nếu đã map sang email
  const displayGenericError =
    fieldErrors.generic && !fieldErrors.generic.toLowerCase().includes("email")
      ? fieldErrors.generic
      : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, email, password, role });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div 
        className="bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-md p-6 border border-[#ebeef0]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">
          {mode === "create" ? "Create New Admin" : "Edit Admin"}
        </h2>

        {displayGenericError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">
            {displayGenericError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2 bg-surface-container-low border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                fieldErrors.name ? "border-red-500" : "border-transparent"
              }`}
              placeholder="Admin Name"
            />
            {fieldErrors.name && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              Email
            </label>
            <input
              type="email"
              required={mode === "create"}
              disabled={mode === "edit"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-3 py-2 ${
                mode === "edit"
                  ? "bg-surface-container-highest cursor-not-allowed text-on-surface-variant border-transparent"
                  : "bg-surface-container-low border"
              } rounded-lg focus:outline-none ${
                mode === "create"
                  ? emailError
                    ? "border-red-500"
                    : "border-transparent focus:ring-2 focus:ring-primary focus:border-transparent"
                  : ""
              } transition-all`}
              placeholder="admin@example.com"
            />
            {mode === "edit" && (
              <p className="text-xs text-on-surface-variant mt-1">
                Email cannot be changed.
              </p>
            )}
            {mode === "create" && emailError && (
              <p className="text-red-500 text-xs mt-1">{emailError}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              {mode === "create" ? "Password" : "New Password (Optional)"}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required={mode === "create"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-3 pr-10 py-2 bg-surface-container-low border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                  fieldErrors.password ? "border-red-500" : "border-transparent"
                }`}
                placeholder={
                  mode === "create" ? "••••••••" : "Leave blank to keep current"
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-red-500 text-xs mt-1">
                {fieldErrors.password}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={`w-full px-3 py-2 bg-surface-container-low border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                fieldErrors.role ? "border-red-500" : "border-transparent"
              }`}
            >
              <option value="ROLE_ADMIN">Admin</option>
              <option value="ROLE_SUPER_ADMIN">Super Admin</option>
            </select>
            {fieldErrors.role && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.role}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading
                ? mode === "create"
                  ? "Creating..."
                  : "Updating..."
                : mode === "create"
                  ? "Create Admin"
                  : "Update Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
