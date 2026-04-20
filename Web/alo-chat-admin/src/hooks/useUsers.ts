import { useState, useCallback } from "react";
import { userService, User, PaginatedUsers } from "@/services/userService";
import { toast } from "sonner";

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState({
    totalPages: 0,
    totalElements: 0,
    page: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(
    async (query?: {
      search?: string;
      status?: string;
      page?: number;
      size?: number;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const data = await userService.getAllUsers(query);
        setUsers(data.content || []);

        let currentPage = 0;
        if (data.page !== undefined) currentPage = data.page;
        else if (data.number !== undefined) currentPage = data.number;

        setPagination({
          totalPages: data.totalPages || 0,
          totalElements: data.totalElements || 0,
          page: currentPage,
        });
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to fetch users");
        toast.error(err.message || "Failed to fetch users");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const banUser = useCallback(
    async (id: string, onSuccess?: () => void) => {
      setLoading(true);
      setError(null);
      try {
        await userService.banUser(id);
        toast.success("User banned successfully!");
        await fetchUsers(); // Refresh sau khi ban
        if (onSuccess) onSuccess();
      } catch (err: any) {
        console.error(err);
        let errMsg = err.message || "Failed to ban user";
        try {
          const parsed = JSON.parse(errMsg);
          if (parsed.message) errMsg = parsed.message;
        } catch (e) {}
        setError(errMsg);
        toast.error(errMsg);
      } finally {
        setLoading(false);
      }
    },
    [fetchUsers],
  );

  const unbanUser = useCallback(
    async (id: string, onSuccess?: () => void) => {
      setLoading(true);
      setError(null);
      try {
        await userService.unbanUser(id);
        toast.success("User unbanned successfully!");
        await fetchUsers(); // Refresh sau khi ban
        if (onSuccess) onSuccess();
      } catch (err: any) {
        console.error(err);
        let errMsg = err.message || "Failed to ban user";
        try {
          const parsed = JSON.parse(errMsg);
          if (parsed.message) errMsg = parsed.message;
        } catch (e) {}
        setError(errMsg);
        toast.error(errMsg);
      } finally {
        setLoading(false);
      }
    },
    [fetchUsers],
  );

  const updateUser = useCallback(
    async (id: string, updateData: any, onSuccess?: () => void) => {
      setLoading(true);
      setError(null);
      try {
        await userService.updateUser(id, updateData);
        toast.success("User updated successfully!");
        await fetchUsers();
        if (onSuccess) onSuccess();
        return { success: true };
      } catch (err: any) {
        let errMsg = err.message || "Failed to update user";
        if (
          err.data &&
          typeof err.data === "object" &&
          Object.keys(err.data).length > 0
        ) {
          return { success: false, fieldErrors: err.data };
        }
        setError(errMsg);
        toast.error(errMsg);
        return { success: false, fieldErrors: { generic: errMsg } };
      } finally {
        setLoading(false);
      }
    },
    [fetchUsers],
  );

  return {
    users,
    pagination,
    loading,
    error,
    fetchUsers,
    banUser,
    unbanUser,
    updateUser,
  };
};
