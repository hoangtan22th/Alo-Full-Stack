import { useState, useCallback } from "react";
import { adminService, AdminUser } from "@/services/adminService";
import { toast } from "sonner";

export const useAdmins = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getAllAdmins();
      setAdmins(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch admins");
      toast.error(err.message || "Failed to fetch admins");
    } finally {
      setLoading(false);
    }
  }, []);

  const createAdmin = useCallback(async (
    adminData: Omit<AdminUser, "id" | "createdAt" | "role"> & { role: string; password: string; },
    onSuccess?: () => void
  ) => {
    setLoading(true);
    setError(null);
    try {
      await adminService.createAdmin(adminData);
      toast.success("Admin created successfully!");
      await fetchAdmins();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || "Failed to create admin";
      try {
         // handle spring boot specific error format if json wrapped
         const parsed = JSON.parse(errMsg);
         if (parsed.message) errMsg = parsed.message;
      } catch (e) {}
      setError(errMsg);
      toast.error(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  }, [fetchAdmins]);

  const deleteAdmin = useCallback(async (id: string, onSuccess?: () => void) => {
    setLoading(true);
    setError(null);
    try {
      await adminService.deleteAdmin(id);
      toast.success("Admin deleted successfully!");
      await fetchAdmins();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || "Failed to delete admin";
      try {
         const parsed = JSON.parse(errMsg);
         if (parsed.message) errMsg = parsed.message;
      } catch (e) {}
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, [fetchAdmins]);

  return {
    admins,
    loading,
    error,
    fetchAdmins,
    createAdmin,
    deleteAdmin,
  };
};
