// src/api/group.api.ts
// Tầng gọi API đến Group Service (Node.js backend qua API Gateway)

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8888";

// ===========================
// TYPES (khớp với Conversation.ts ở backend)
// ===========================

export interface IMember {
  userId: string;
  role: "LEADER" | "DEPUTY" | "MEMBER";
  joinedAt: string;
}

export interface IJoinRequest {
  userId: string;
  requestedAt: string;
}

export interface IGroup {
  _id: string;
  name: string;
  groupAvatar: string;
  isGroup: boolean;
  lastMessage?: string;
  members: IMember[];
  mutedBy: string[];
  hiddenBy: string[];
  joinRequests: IJoinRequest[];
  isBanned: boolean;
  isApprovalRequired: boolean;
  isLinkEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
}

// ===========================
// HELPER: Build headers với X-User-Id + JWT
// ===========================

function getHeaders(userId: string, token?: string): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-User-Id": userId,
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// ===========================
// 1. TẠO NHÓM MỚI
// POST /api/v1/groups
// Body: FormData { name, userIds (JSON array), avatarFile? }
// Header: X-User-Id, Authorization
// ===========================

export async function createGroup(params: {
  name: string;
  userIds: string[];
  avatarFile?: File;
  userId: string;
  token?: string;
}): Promise<ApiResponse<IGroup>> {
  const formData = new FormData();
  formData.append("name", params.name);
  formData.append("userIds", JSON.stringify(params.userIds));
  if (params.avatarFile) {
    formData.append("avatarFile", params.avatarFile);
  }

  const headers: HeadersInit = { "X-User-Id": params.userId };
  if (params.token) {
    (headers as Record<string, string>)[
      "Authorization"
    ] = `Bearer ${params.token}`;
  }

  const res = await fetch(`${BASE_URL}/api/v1/groups`, {
    method: "POST",
    headers,
    body: formData,
  });
  return res.json();
}

// ===========================
// 2. CẬP NHẬT THÔNG TIN NHÓM
// PUT /api/v1/groups/:groupId
// Body: FormData { name?, avatarFile? }
// Header: X-User-Id
// ===========================

export async function updateGroup(params: {
  groupId: string;
  name?: string;
  avatarFile?: File;
  userId: string;
  token?: string;
}): Promise<ApiResponse<IGroup>> {
  const formData = new FormData();
  if (params.name) formData.append("name", params.name);
  if (params.avatarFile) formData.append("avatarFile", params.avatarFile);

  const headers: HeadersInit = { "X-User-Id": params.userId };
  if (params.token) {
    (headers as Record<string, string>)[
      "Authorization"
    ] = `Bearer ${params.token}`;
  }

  const res = await fetch(`${BASE_URL}/api/v1/groups/${params.groupId}`, {
    method: "PUT",
    headers,
    body: formData,
  });
  return res.json();
}

// ===========================
// 3. XÓA NHÓM
// DELETE /api/v1/groups/:groupId
// Header: X-User-Id
// ===========================

export async function deleteGroup(params: {
  groupId: string;
  userId: string;
  token?: string;
}): Promise<ApiResponse> {
  const res = await fetch(`${BASE_URL}/api/v1/groups/${params.groupId}`, {
    method: "DELETE",
    headers: getHeaders(params.userId, params.token),
  });
  return res.json();
}

// ===========================
// 4. LẤY DANH SÁCH NHÓM CỦA TÔI
// GET /api/v1/groups/me
// Header: X-User-Id
// Response: { data: IGroup[] }
// ===========================

export async function getMyGroups(params: {
  userId: string;
  token?: string;
}): Promise<ApiResponse<IGroup[]>> {
  const res = await fetch(`${BASE_URL}/api/v1/groups/me`, {
    method: "GET",
    headers: getHeaders(params.userId, params.token),
  });
  return res.json();
}

// ===========================
// 5. LẤY THÔNG TIN CHI TIẾT NHÓM
// GET /api/v1/groups/:groupId
// Header: X-User-Id
// ===========================

export async function getGroupById(params: {
  groupId: string;
  userId: string;
  token?: string;
}): Promise<ApiResponse<IGroup>> {
  const res = await fetch(`${BASE_URL}/api/v1/groups/${params.groupId}`, {
    method: "GET",
    headers: getHeaders(params.userId, params.token),
  });
  return res.json();
}

// ===========================
// 6. THÊM THÀNH VIÊN VÀO NHÓM
// POST /api/v1/groups/:groupId/members
// Body: { newUserId: string }
// Header: X-User-Id
// ===========================

export async function addMember(params: {
  groupId: string;
  newUserId: string;
  userId: string;
  token?: string;
}): Promise<ApiResponse<IGroup>> {
  const res = await fetch(`${BASE_URL}/api/v1/groups/${params.groupId}/members`, {
    method: "POST",
    headers: getHeaders(params.userId, params.token),
    body: JSON.stringify({ newUserId: params.newUserId }),
  });
  return res.json();
}

// ===========================
// 7. XÓA / RỜI NHÓM
// DELETE /api/v1/groups/:groupId/members/:userId
// Header: X-User-Id (requesterId)
// Nếu userId === requesterId => tự rời
// Nếu khác => kick thành viên
// ===========================

export async function removeMember(params: {
  groupId: string;
  targetUserId: string;
  userId: string; // người thực hiện
  token?: string;
}): Promise<ApiResponse<IGroup>> {
  const res = await fetch(
    `${BASE_URL}/api/v1/groups/${params.groupId}/members/${params.targetUserId}`,
    {
      method: "DELETE",
      headers: getHeaders(params.userId, params.token),
    },
  );
  return res.json();
}

// Alias tiện dụng: tự rời nhóm
export async function leaveGroup(params: {
  groupId: string;
  userId: string;
  token?: string;
}): Promise<ApiResponse<IGroup>> {
  return removeMember({
    groupId: params.groupId,
    targetUserId: params.userId,
    userId: params.userId,
    token: params.token,
  });
}

// ===========================
// 8. CẬP NHẬT ROLE THÀNH VIÊN
// PUT /api/v1/groups/:groupId/members/:userId/role
// Body: { role: "LEADER" | "DEPUTY" | "MEMBER" }
// Header: X-User-Id
// ===========================

export async function updateMemberRole(params: {
  groupId: string;
  targetUserId: string;
  role: "LEADER" | "DEPUTY" | "MEMBER";
  userId: string;
  token?: string;
}): Promise<ApiResponse<IGroup>> {
  const res = await fetch(
    `${BASE_URL}/api/v1/groups/${params.groupId}/members/${params.targetUserId}/role`,
    {
      method: "PUT",
      headers: getHeaders(params.userId, params.token),
      body: JSON.stringify({ role: params.role }),
    },
  );
  return res.json();
}

// ===========================
// 9. CHUYỂN NHƯỢNG TRƯỞNG NHÓM
// POST /api/v1/groups/assign-leader
// Body: { groupId, newLeaderId }
// Header: X-User-Id
// ===========================

export async function assignNewLeader(params: {
  groupId: string;
  newLeaderId: string;
  userId: string;
  token?: string;
}): Promise<ApiResponse<IGroup>> {
  const res = await fetch(`${BASE_URL}/api/v1/groups/assign-leader`, {
    method: "POST",
    headers: getHeaders(params.userId, params.token),
    body: JSON.stringify({
      groupId: params.groupId,
      newLeaderId: params.newLeaderId,
    }),
  });
  return res.json();
}

// ===========================
// 10. GỬI YÊU CẦU THAM GIA NHÓM
// POST /api/v1/groups/:groupId/join-requests
// Header: X-User-Id
// ===========================

export async function requestJoinGroup(params: {
  groupId: string;
  userId: string;
  token?: string;
}): Promise<ApiResponse<IGroup>> {
  const res = await fetch(
    `${BASE_URL}/api/v1/groups/${params.groupId}/join-requests`,
    {
      method: "POST",
      headers: getHeaders(params.userId, params.token),
    },
  );
  return res.json();
}

// ===========================
// 11. LẤY DANH SÁCH YÊU CẦU THAM GIA
// GET /api/v1/groups/:groupId/join-requests
// Header: X-User-Id (phải là LEADER/DEPUTY)
// ===========================

export async function getJoinRequests(params: {
  groupId: string;
  userId: string;
  token?: string;
}): Promise<ApiResponse<IJoinRequest[]>> {
  const res = await fetch(
    `${BASE_URL}/api/v1/groups/${params.groupId}/join-requests`,
    {
      method: "GET",
      headers: getHeaders(params.userId, params.token),
    },
  );
  return res.json();
}

// ===========================
// 12. DUYỆT YÊU CẦU THAM GIA
// POST /api/v1/groups/:groupId/join-requests/:userId/approve
// Header: X-User-Id (LEADER/DEPUTY)
// ===========================

export async function approveJoinRequest(params: {
  groupId: string;
  targetUserId: string;
  userId: string;
  token?: string;
}): Promise<ApiResponse<IGroup>> {
  const res = await fetch(
    `${BASE_URL}/api/v1/groups/${params.groupId}/join-requests/${params.targetUserId}/approve`,
    {
      method: "POST",
      headers: getHeaders(params.userId, params.token),
    },
  );
  return res.json();
}

// ===========================
// 13. TỪ CHỐI YÊU CẦU THAM GIA
// DELETE /api/v1/groups/:groupId/join-requests/:userId/reject
// Header: X-User-Id (LEADER/DEPUTY)
// ===========================

export async function rejectJoinRequest(params: {
  groupId: string;
  targetUserId: string;
  userId: string;
  token?: string;
}): Promise<ApiResponse> {
  const res = await fetch(
    `${BASE_URL}/api/v1/groups/${params.groupId}/join-requests/${params.targetUserId}/reject`,
    {
      method: "DELETE",
      headers: getHeaders(params.userId, params.token),
    },
  );
  return res.json();
}

// ===========================
// 14. CẬP NHẬT CÀI ĐẶT PHÊ DUYỆT
// PUT /api/v1/groups/:groupId/approval-setting
// Body: { isApprovalRequired: boolean }
// Header: X-User-Id (LEADER/DEPUTY)
// ===========================

export async function updateApprovalSetting(params: {
  groupId: string;
  isApprovalRequired: boolean;
  userId: string;
  token?: string;
}): Promise<ApiResponse<IGroup>> {
  const res = await fetch(
    `${BASE_URL}/api/v1/groups/${params.groupId}/approval-setting`,
    {
      method: "PUT",
      headers: getHeaders(params.userId, params.token),
      body: JSON.stringify({ isApprovalRequired: params.isApprovalRequired }),
    },
  );
  return res.json();
}

// ===========================
// 15. CẬP NHẬT CÀI ĐẶT THAM GIA BẰNG LINK
// PUT /api/v1/groups/:groupId/link-setting
// Body: { isLinkEnabled: boolean }
// Header: X-User-Id (LEADER/DEPUTY)
// ===========================

export async function updateLinkSetting(params: {
  groupId: string;
  isLinkEnabled: boolean;
  userId: string;
  token?: string;
}): Promise<ApiResponse<IGroup>> {
  const res = await fetch(
    `${BASE_URL}/api/v1/groups/${params.groupId}/link-setting`,
    {
      method: "PUT",
      headers: getHeaders(params.userId, params.token),
      body: JSON.stringify({ isLinkEnabled: params.isLinkEnabled }),
    },
  );
  return res.json();
}

// ===========================
// 16. LẤY HOẶC TẠO CUỘC TRÒ CHUYỆN 1-1
// POST /api/v1/groups/direct
// Body: { targetUserId: string }
// Header: X-User-Id
// ===========================

export async function getOrCreateDirectConversation(params: {
  targetUserId: string;
  userId: string;
  token?: string;
}): Promise<IGroup> {
  const res = await fetch(`${BASE_URL}/api/v1/groups/direct`, {
    method: "POST",
    headers: getHeaders(params.userId, params.token),
    body: JSON.stringify({ targetUserId: params.targetUserId }),
  });
  return res.json();
}