// src/constants/api-paths.ts
export const API_PATHS = {
  GROUPS: {
    BASE: "/groups",
    MY_GROUPS: "/groups/me",
    GROUP_DETAIL: (id: string) => `/groups/${id}`,
    CREATE: "/groups",
    LEAVE: (groupId: string, userId: string) =>
      `/groups/${groupId}/members/${userId}`,
    UPDATE_APPROVAL: (groupId: string) => `/groups/${groupId}/approval-setting`,
    UPDATE_LINK: (groupId: string) => `/groups/${groupId}/link-setting`,
    JOIN_REQUEST: (groupId: string) => `/groups/${groupId}/join-requests`,
    APPROVE_REQUEST: (groupId: string, userId: string) =>
      `/groups/${groupId}/join-requests/${userId}/approve`,
    REJECT_REQUEST: (groupId: string, userId: string) =>
      `/groups/${groupId}/join-requests/${userId}/reject`,
    DIRECT: "/groups/direct",
  },
  AUTH: {
    ME: "/auth/me",
  },
  CONTACTS: {
    FRIENDS: "/contacts/friends",
  },
};
