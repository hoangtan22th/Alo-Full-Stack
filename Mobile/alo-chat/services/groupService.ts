import api from "./api";

export const groupService = {
  createGroup: async (name: string, userIds: string[], imageUri?: string) => {
    try {
      if (imageUri) {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("userIds", JSON.stringify(userIds));

        const filename = imageUri.split("/").pop() || "avatar.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append("avatarFile", {
          uri: imageUri,
          name: filename,
          type,
        } as any);

        const data = await api.post<any, any>(`/groups`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        return data;
      }

      const data = await api.post<any, any>(`/groups`, {
        name,
        userIds,
      });
      return data;
    } catch (error) {
      console.error("Lỗi tạo nhóm:", error);
      throw error;
    }
  },

  getMyGroups: async () => {
    try {
      const data = await api.get<any, any>(`/groups/me`);
      return data;
    } catch (error) {
      console.error("Lỗi lấy danh sách nhóm:", error);
      return [];
    }
  },
};
