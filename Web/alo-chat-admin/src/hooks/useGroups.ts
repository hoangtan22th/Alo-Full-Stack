import { useState, useCallback } from "react";
import { groupService, Group } from "@/services/groupService";
import { toast } from "sonner";

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 0,
    totalPages: 0,
    totalElements: 0,
  });

  const fetchGroups = useCallback(
    async (params?: {
      name?: string;
      isGroup?: boolean;
      isBanned?: boolean | string;
      page?: number;
      size?: number;
    }) => {
      try {
        setLoading(true);
        setError(null);

        const queryParams: any = { ...params };
        if (params?.isBanned === "ALL" || params?.isBanned === undefined) {
          delete queryParams.isBanned;
        } else if (params?.isBanned === "BANNED") {
          queryParams.isBanned = true;
        } else if (params?.isBanned === "ACTIVE") {
          queryParams.isBanned = false;
        }

        const res = await groupService.getAllGroups(queryParams);

        setGroups(res.content || []);
        setPagination({
          page: res.page ?? 0,
          totalPages: res.totalPages || 0,
          totalElements: res.totalElements || 0,
        });
      } catch (err: any) {
        setError(err.message || "Failed to load groups");
        toast.error("Failed to load groups");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const toggleBanGroup = async (id: string, isBanned: boolean) => {
    try {
      await groupService.toggleBanGroup(id, isBanned);
      setGroups((prev) =>
        prev.map((g) => (g._id === id ? { ...g, isBanned } : g)),
      );
      toast.success(
        isBanned ? "Group banned successfully" : "Group unbanned successfully",
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update group status");
    }
  };

  return {
    groups,
    pagination,
    loading,
    error,
    fetchGroups,
    toggleBanGroup,
  };
}
