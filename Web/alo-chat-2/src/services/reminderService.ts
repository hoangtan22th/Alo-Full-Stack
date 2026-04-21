import api from "./api";

export interface ReminderDTO {
  _id: string;
  conversationId: string;
  creatorId: string;
  title: string;
  time: string; // ISO string
  repeat: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "MANY_DAYS_WEEKLY";
  repeatDays?: number[];
  remindFor: "CREATOR" | "GROUP";
  status: "ACTIVE" | "DONE" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
}

export const reminderService = {
  getRemindersByConversation: async (groupId: string): Promise<ReminderDTO[]> => {
    try {
      const response = await api.get(`/groups/${groupId}/reminders`);
      return response as any;
    } catch (error) {
      console.error("Lỗi khi lấy danh sách nhắc hẹn:", error);
      return [];
    }
  },

  createReminder: async (
    groupId: string,
    payload: {
      title: string;
      time: string;
      repeat: string;
      repeatDays?: number[];
      remindFor: string;
    },
  ): Promise<ReminderDTO | null> => {
    try {
      const response = await api.post(`/groups/${groupId}/reminders`, payload);
      return response as any;
    } catch (error) {
      console.error("Lỗi khi tạo nhắc hẹn:", error);
      return null;
    }
  },

  updateReminder: async (
    reminderId: string,
    payload: {
      title?: string;
      time?: string;
      repeat?: string;
      repeatDays?: number[];
      remindFor?: string;
    },
  ): Promise<ReminderDTO | null> => {
    try {
      const response = await api.put(`/groups/reminders/${reminderId}`, payload);
      return response as any;
    } catch (error) {
      console.error("Lỗi khi cập nhật nhắc hẹn:", error);
      return null;
    }
  },

  deleteReminder: async (reminderId: string): Promise<boolean> => {
    try {
      await api.delete(`/groups/reminders/${reminderId}`);
      return true;
    } catch (error) {
      console.error("Lỗi khi xóa nhắc hẹn:", error);
      return false;
    }
  },
};
