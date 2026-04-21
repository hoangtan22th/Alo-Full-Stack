import { Request, Response } from "express";
import Conversation from "../models/Conversation";
import { uploadImageToS3, deleteImageFromS3 } from "../services/s3Service";

import rabbitMQProducer from "../services/rabbitMQProducer";

// Helper lấy danh sách bạn bè
async function getFriendIds(
  userId: string,
  authHeader?: string,
): Promise<string[]> {
  try {
    // Ép IPv4 127.0.0.1 để tránh Node.js dùng IPv6 (::1) mặc định đụng Java Spring Boot
    const gatewayUrl = process.env.GATEWAY_URL || "http://127.0.0.1:8888";

    // API contact-service/api-gateway thường check security với Authorization JWT Token. Phải pass theo header X-User-Id hoặc Authorization.
    const headers: any = {
      "X-User-Id": userId || "",
      "Content-Type": "application/json",
    };

    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const response = await fetch(`${gatewayUrl}/api/v1/contacts/friends`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      console.log(
        `[getFriendIds] Call API Contact thất bại với HTTP status: ${response.status}`,
      );
      return [];
    }

    const result = await response.json();
    console.log(
      `[getFriendIds] Raw response:`,
      JSON.stringify(result).substring(0, 150),
    );

    // API Spring Boot trả về format ApiResponse { code: x, message: "...", data: [...] }
    const data = result.data;
    const friendIds: string[] = [];
    if (Array.isArray(data)) {
      for (const f of data) {
        const id = f.requesterId === userId ? f.recipientId : f.requesterId;
        if (id) friendIds.push(id.toString()); // Đảm bảo string ID
      }
    }
    console.log(
      `[getFriendIds] Thành công tải ${friendIds.length} bạn bè của ${userId}`,
    );
    return friendIds;
  } catch (error) {
    console.error(`[getFriendIds] Call API Contact lỗi ngoại lệ:`, error);
    return [];
  }
}

// Helper gửi thông báo hệ thống vào room chat
async function postSystemMessage(
  groupId: string,
  requesterId: string,
  content: string,
  authHeader?: string | string[],
): Promise<void> {
  try {
    const gatewayUrl = process.env.GATEWAY_URL || "http://127.0.0.1:8888";
    const headers: any = {
      "X-User-Id": requesterId,
      "Content-Type": "application/json",
    };
    if (authHeader) {
      headers["Authorization"] = Array.isArray(authHeader)
        ? authHeader[0]
        : authHeader;
    }

    await fetch(`${gatewayUrl}/api/v1/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        conversationId: groupId,
        type: "system",
        content,
      }),
    });
  } catch (error) {
    console.error(`[postSystemMessage] Failed to send system message:`, error);
  }
}

// Helper lấy tên đầy đủ của người dùng từ user-service
async function getUserFullName(
  userId: string,
  authHeader?: string | string[],
): Promise<string> {
  try {
    const gatewayUrl = process.env.GATEWAY_URL || "http://127.0.0.1:8888";
    const headers: any = {
      "X-User-Id": userId,
      "Content-Type": "application/json",
    };
    if (authHeader) {
      headers["Authorization"] = Array.isArray(authHeader)
        ? authHeader[0]
        : authHeader;
    }

    const response = await fetch(`${gatewayUrl}/api/v1/users/${userId}`, {
      method: "GET",
      headers,
    });

    if (response.ok) {
      const result = await response.json();
      return result.data?.fullName || "Thành viên";
    }
    return "Thành viên";
  } catch (error) {
    console.error(`[getUserFullName] Failed to fetch user info:`, error);
    return "Thành viên";
  }
}

// 1. Tạo Nhóm mới (Tạo nhóm từ 3 người)
export const createGroup = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // Với multipart/form-data, các trường được gửi dưới dạng string trong req.body
    let { name, userIds } = req.body;
    let groupAvatar = "";
    const creatorId = String(req.headers["x-user-id"] || "");

    // Parse userIds nếu gửi dưới dạng string json
    if (typeof userIds === "string") {
      try {
        userIds = JSON.parse(userIds);
      } catch (e) {
        userIds = userIds.split(",").map((id: string) => id.trim());
      }
    }

    // Kiểm tra số lượng: Người tạo + Danh sách mời phải >= 3
    if (!userIds || !Array.isArray(userIds) || userIds.length < 2) {
      res.status(400).json({
        error: "Nhóm phải có ít nhất 3 thành viên (bao gồm người tạo)",
      });
      return;
    }

    // Lấy danh sách bạn bè của người tạo nhóm
    console.log(`[CreateGroup] Check danh sách userIds truyền vào:`, userIds);
    // Bổ sung truyền header Authorization JWT qua Request Fetch nội bộ
    const authHeader = req.headers.authorization;
    const friendIds = await getFriendIds(creatorId, authHeader);

    // So sánh dạng string thuần tuý do Node & Java có thể chênh lệch Object ID
    const normalizedFriendIds = friendIds.map((f) => f.toString());
    const nonFriends = userIds.filter(
      (id) => !normalizedFriendIds.includes(id.toString()),
    );

    if (nonFriends.length > 0) {
      console.log(
        `[CreateGroup] Từ chối! Phát hiện users chưa kết bạn: ${nonFriends.join(", ")}`,
      );
      res.status(403).json({
        error: "Chỉ được phép mời người đã kết bạn vào nhóm",
      });
      return;
    }
    // Handle Image Upload (Nếu có)
    if (req.file) {
      try {
        console.log(`[CreateGroup] Đang upload avatar nhóm lên S3...`);
        groupAvatar = await uploadImageToS3(
          req.file.buffer,
          req.file.mimetype,
          "alo_group_images",
        );
        console.log(`[CreateGroup] Upload thành công URL: ${groupAvatar}`);
      } catch (uploadError) {
        console.error(`[CreateGroup] Lỗi upload S3:`, uploadError);
        // Có thể chọn chặn request hoặc báo lỗi, nhưng tốt nhất vẫn để nhóm được tạo và trả về message
      }
    } else if (req.body.groupAvatar) {
      // Nếu chỉ truyền link URL thuần tuý
      groupAvatar = req.body.groupAvatar;
    }
    // Tạo danh sách members ban đầu
    const initialMembers = [
      { userId: creatorId, role: "LEADER" },
      ...userIds.map((id) => ({ userId: id, role: "MEMBER" })),
    ];

    const newGroup = await Conversation.create({
      name,
      groupAvatar,
      isGroup: true,
      members: initialMembers,
    });

    // Real-time Sync: Thông báo cho tất cả thành viên về nhóm mới
    rabbitMQProducer.publishConversationCreated(newGroup).catch(console.error);
    // Thông báo đẩy (In-app) cho các thành viên được thêm (ngoại trừ người tạo)
    userIds.forEach((uId: string) => {
      rabbitMQProducer.publishAddedToGroup(uId, newGroup).catch(console.error);
    });

    // Bắn tin nhắn hệ thống: X đã tạo nhóm
    const creatorName = await getUserFullName(creatorId, authHeader);
    await postSystemMessage(
      String(newGroup._id),
      creatorId,
      `${creatorName} đã tạo nhóm`,
      authHeader,
    );

    res.status(201).json({ message: "Tạo nhóm thành công", data: newGroup });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Thêm Thành viên (Chỉ thêm người chưa có trong nhóm)
export const addMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = String(req.params.groupId || "");
    const { newUserId } = req.body;
    const requesterId = String(req.headers["x-user-id"] || "");

    // Tìm nhóm và kiểm tra xem user đã tồn tại chưa
    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Không tìm thấy nhóm" });
      return;
    }

    const isExist = group.members.some(
      (m) => m.userId.toString() === newUserId.toString(),
    );
    if (isExist) {
      res
        .status(400)
        .json({ error: "Người dùng này đã là thành viên của nhóm" });
      return;
    }

    // Kiểm tra xem có bị ban hoặc chặn mời lại không
    const removedInfo = group.removedMembers?.find(
      (rm) => rm.userId.toString() === newUserId.toString(),
    );
    if (removedInfo) {
      if (removedInfo.isBanned) {
        res
          .status(403)
          .json({ error: "Người dùng này đã bị cấm tham gia nhóm" });
        return;
      }
      if (removedInfo.preventReinvite) {
        res
          .status(403)
          .json({ error: "Người dùng này đã chặn lời mời vào nhóm này" });
        return;
      }
    }

    // Kiểm tra đã kết bạn chưa
    const authHeader = req.headers.authorization;
    const friendIds = await getFriendIds(requesterId, authHeader);
    const normalizedFriendIds = friendIds.map((f) => f.toString());

    if (!normalizedFriendIds.includes(newUserId.toString())) {
      res
        .status(403)
        .json({ error: "Chỉ có thể thêm người đã kết bạn vào nhóm" });
      return;
    }

    const requester = group.members.find(
      (m) => m.userId.toString() === requesterId,
    );
    const requesterRole = requester?.role;

    if (
      group.isApprovalRequired &&
      requesterRole !== "LEADER" &&
      requesterRole !== "DEPUTY"
    ) {
      const alreadyRequested = group.joinRequests.some(
        (request) => request.userId.toString() === newUserId.toString(),
      );
      if (!alreadyRequested) {
        group.joinRequests.push({ userId: newUserId, requestedAt: new Date() });
        await group.save();
      }
      res.status(200).json({
        message: "Yêu cầu tham gia đã gửi và đang chờ duyệt",
        data: group,
      });
      return;
    }

    const { isHistoryVisible: overrideIsHistoryVisible } = req.body;

    // Xác định xem user mới này có được xem lịch sử không
    // Ưu tiên override từ request, nếu không thì lấy mặc định của nhóm
    const canViewHistory =
      typeof overrideIsHistoryVisible === "boolean"
        ? overrideIsHistoryVisible
        : group.isHistoryVisible;

    group.members.push({
      userId: newUserId,
      role: "MEMBER",
      joinedAt: canViewHistory ? group.createdAt || new Date() : new Date(),
    });
    await group.save();

    // Real-time Sync: Thông báo cho thành viên mới về nhóm này
    rabbitMQProducer.publishConversationCreated(group).catch(console.error);
    // Thông báo đẩy (In-app) cho thành viên mới
    rabbitMQProducer
      .publishAddedToGroup(String(newUserId), group)
      .catch(console.error);

    // Bắn tin nhắn hệ thống
    const newUserName = await getUserFullName(String(newUserId), authHeader);
    await postSystemMessage(
      groupId,
      requesterId,
      `${newUserName} đã được thêm vào nhóm`,
      authHeader,
    );

    rabbitMQProducer.publishGroupUpdated(group).catch(console.error);
    res.status(200).json({ message: "Đã thêm thành viên", data: group });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Kick / Rời nhóm (Phân quyền Kick & Rời nhóm)
export const removeMember = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = String(req.params.groupId || "");
    const userId = String(req.params.userId || "");
    const requesterId = String(req.headers["x-user-id"] || "");
    const { isSilent, isBanned, preventReinvite } = req.body;

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Không tìm thấy nhóm" });
      return;
    }

    const requester = group.members.find((m) => m.userId === requesterId);
    const target = group.members.find((m) => m.userId === userId);

    if (!requester || !target) {
      res.status(400).json({ error: "Thành viên không hợp lệ" });
      return;
    }

    let reason: "LEAVE" | "KICK" = "KICK";

    // TRƯỜNG HỢP 1: TỰ RỜI NHÓM
    // Sử dụng trim() và toString() để đảm bảo so sánh chính xác giữa Mongo ID và Header ID
    if (userId.toString().trim() === requesterId.toString().trim()) {
      if (requester.role === "LEADER") {
        res.status(400).json({
          error:
            "Trưởng nhóm không thể rời đi. Hãy trao quyền Trưởng nhóm cho người khác trước.",
        });
        return;
      }
      reason = "LEAVE";
    }
    // TRƯỜNG HỢP 2: BỊ KICK
    else {
      if (requester.role === "MEMBER") {
        res.status(403).json({ error: "Bạn không có quyền kick thành viên" });
        return;
      }
      if (requester.role === "DEPUTY" && target.role !== "MEMBER") {
        res
          .status(403)
          .json({ error: "Phó nhóm chỉ có thể kick Thành viên thường" });
        return;
      }
      reason = "KICK";
    }

    // Cập nhật removedMembers
    if (!group.removedMembers) group.removedMembers = [];

    // Xóa thông tin cũ nếu có
    group.removedMembers = group.removedMembers.filter(
      (rm) => rm.userId !== userId,
    );

    group.removedMembers.push({
      userId,
      removedAt: new Date(),
      reason,
      isBanned: reason === "KICK" ? !!isBanned : false,
      preventReinvite: reason === "LEAVE" ? !!preventReinvite : false,
    });

    // Thực hiện xóa khỏi members
    group.members = group.members.filter((m) => m.userId !== userId);
    await group.save();

    // Real-time Sync
    rabbitMQProducer
      .publishConversationRemoved(
        groupId,
        userId,
        group.name || "Nhóm",
        reason.toLowerCase() as "kick" | "leave" | "delete",
      )
      .catch(console.error);

    // Bắn tin nhắn hệ thống (Nếu không phải rời trong im lặng)
    if (!isSilent) {
      const targetName = await getUserFullName(
        userId,
        req.headers.authorization,
      );
      const messageContent =
        reason === "LEAVE"
          ? `${targetName} đã rời khỏi nhóm`
          : `${targetName} đã bị mời ra khỏi nhóm`;
      await postSystemMessage(
        groupId,
        requesterId,
        messageContent,
        req.headers.authorization,
      );
    }

    rabbitMQProducer.publishGroupUpdated(group).catch(console.error);
    res.status(200).json({ message: "Thao tác thành công", data: group });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Trao quyền (Phó nhóm / Trưởng nhóm)
// Bổ nhiệm phó nhóm
export const updateRole = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = String(req.params.groupId || "");
    const userId = String(req.params.userId || "");
    const { newRole } = req.body;
    const requesterId = String(req.headers["x-user-id"] || "");

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Nhóm không tồn tại" });
      return;
    }

    // Chỉ Trưởng nhóm mới có quyền bổ nhiệm Phó nhóm
    const requester = group.members.find((m) => m.userId === requesterId);
    if (!requester || requester.role !== "LEADER") {
      res.status(403).json({ error: "Chỉ Trưởng nhóm mới có quyền bổ nhiệm" });
      return;
    }

    if (newRole === "LEADER") {
      res
        .status(400)
        .json({ error: "Dùng API chuyển nhượng để thay đổi Trưởng nhóm" });
      return;
    }

    await Conversation.findOneAndUpdate(
      { _id: groupId, "members.userId": userId } as any,
      { $set: { "members.$.role": newRole } } as any,
    );

    // Bắn tin nhắn hệ thống
    const targetName = await getUserFullName(userId, req.headers.authorization);
    const roleText = newRole === "DEPUTY" ? "PHÓ NHÓM" : "THÀNH VIÊN";
    let systemMsg = `${targetName} đã được bổ nhiệm làm ${roleText}`;
    if (newRole === "MEMBER") {
      systemMsg = `${targetName} đã bị xoá quyền PHÓ NHÓM`;
    }
    await postSystemMessage(
      groupId,
      requesterId,
      systemMsg,
      req.headers.authorization,
    );

    // Emit update event
    const updatedGroup = await Conversation.findById(groupId);
    if (updatedGroup) {
      rabbitMQProducer.publishGroupUpdated(updatedGroup).catch(console.error);
    }

    res.status(200).json({ message: "Cập nhật quyền thành công" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Chuyển nhượng Trưởng nhóm
export const assignNewLeader = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = String(req.body.groupId || "");
    const newLeaderId = String(req.body.newLeaderId || "");
    const currentLeaderId = String(req.headers["x-user-id"] || "");

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Nhóm không tồn tại" });
      return;
    }

    const leader = group.members.find((m) => m.userId === currentLeaderId);
    if (!leader || leader.role !== "LEADER") {
      res.status(403).json({ error: "Bạn không phải Trưởng nhóm" });
      return;
    }

    // 1. Hạ cấp Trưởng nhóm cũ thành MEMBER (hoặc DEPUTY tùy bạn)
    // 2. Nâng cấp Trưởng nhóm mới thành LEADER
    await Conversation.updateOne(
      { _id: groupId, "members.userId": currentLeaderId },
      { $set: { "members.$.role": "MEMBER" } } as any,
    );
    await Conversation.updateOne(
      { _id: groupId, "members.userId": newLeaderId },
      { $set: { "members.$.role": "LEADER" } } as any,
    );

    // Bắn tin nhắn hệ thống
    const newLeaderName = await getUserFullName(
      String(newLeaderId),
      req.headers.authorization,
    );
    await postSystemMessage(
      groupId,
      currentLeaderId,
      `${newLeaderName} đã trở thành TRƯỞNG NHÓM mới`,
      req.headers.authorization,
    );

    // Emit update event
    const updatedGroup = await Conversation.findById(groupId);
    if (updatedGroup) {
      rabbitMQProducer.publishGroupUpdated(updatedGroup).catch(console.error);
    }

    res.status(200).json({ message: "Đã chuyển nhượng quyền Trưởng nhóm" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 5. Xoá nhóm
export const deleteGroup = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = String(req.params.groupId || "");
    const requesterId = req.headers["x-user-id"] as string;

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Nhóm không tồn tại" });
      return;
    }

    const leader = group.members.find((m) => m.userId === requesterId);
    if (!leader || leader.role !== "LEADER") {
      res
        .status(403)
        .json({ error: "Chỉ Trưởng nhóm mới có quyền giải tán nhóm" });
      return;
    }

    if (group.groupAvatar) {
      await deleteImageFromS3(group.groupAvatar);
    }

    await Conversation.findByIdAndDelete(groupId);

    // Real-time Sync: Thông báo cho tất cả thành viên rằng nhóm đã giải tán
    if (group.members) {
      for (const member of group.members) {
        if (member.userId) {
          rabbitMQProducer
            .publishConversationRemoved(
              groupId,
              String(member.userId),
              group.name || "Nhóm",
              "delete",
            )
            .catch(console.error);
        }
      }
    }

    res.status(200).json({ message: "Nhóm đã được giải tán vĩnh viễn" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 6. Lấy danh sách nhóm của User hiện tại
export const getMyGroups = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const currentUserId = String(req.headers["x-user-id"] || "");
    const type = req.query.type as string;

    const query: any = {
      "members.userId": currentUserId,
    };

    if (type !== "all") {
      query.isGroup = true;
    }

    const groups = await Conversation.find(query).sort({ updatedAt: -1 });

    // Lọc theo mốc thời gian xoá (clearedAt)
    const filteredGroups = groups.filter((g) => {
      // Nếu là tab "Nhóm" (type != 'all') và là Group, thì luôn hiện
      if (type !== "all" && g.isGroup) return true;

      const clearedAt = g.clearedAt ? g.clearedAt.get(currentUserId) : null;
      if (!clearedAt) return true; // Chưa từng xoá thì hiện bình thường

      // Nếu đã xoá, chỉ hiện nếu có tin nhắn mới sau mốc xoá
      if (!g.lastMessageAt) return false;
      return new Date(g.lastMessageAt) > new Date(clearedAt);
    });

    res.status(200).json({ data: filteredGroups });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getGroupById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = String(req.params.groupId || "").trim();
    if (!groupId || groupId.length !== 24) {
      res.status(400).json({ error: `Mã nhóm không hợp lệ: ${groupId}` });
      return;
    }
    
    // Try both methods for robustness
    let group = await Conversation.findById(groupId);
    if (!group) {
      group = await Conversation.findOne({ _id: groupId });
    }

    if (!group) {
      res.status(404).json({ error: `Không tìm thấy nhóm với ID: ${groupId}` });
      return;
    }
    res.status(200).json({ data: group });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 8. Yêu cầu tham gia nhóm
export const requestJoinGroup = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = String(req.params.groupId || "").trim();
    const requesterId = String(req.headers["x-user-id"] || "");

    if (!groupId || groupId.length !== 24) {
      res.status(400).json({ error: "Mã nhóm không hợp lệ" });
      return;
    }

    if (!requesterId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Không tìm thấy nhóm" });
      return;
    }

    if (!group.isGroup) {
      res.status(400).json({ error: "Đây không phải là một nhóm" });
      return;
    }

    // Checking if already a member
    const isMember = group.members.some(
      (m) => m.userId.toString() === requesterId,
    );
    if (isMember) {
      res.status(200).json({
        message: "Bạn đã là thành viên của nhóm",
        joined: true,
        alreadyMember: true,
        data: group,
      });
      return;
    }

    // Checking if already requested
    const hasRequested = group.joinRequests?.some(
      (r) => r.userId.toString() === requesterId,
    );
    if (hasRequested) {
      res.status(400).json({ error: "Bạn đã gửi yêu cầu tham gia rồi" });
      return;
    }

    // Checking if banned
    const removedInfo = group.removedMembers?.find(
      (m) => m.userId.toString() === requesterId,
    );
    if (removedInfo?.isBanned) {
      res.status(403).json({ error: "Bạn đã bị chặn khỏi nhóm này" });
      return;
    }

    // Nếu nhóm không bật phê duyệt thì cho tham gia trực tiếp
    if (!group.isApprovalRequired) {
      group.members.push({
        userId: requesterId,
        role: "MEMBER",
        joinedAt: group.isHistoryVisible
          ? group.createdAt || new Date()
          : new Date(),
      });

      // Xoá join requests nếu lỡ có trễ (ví dụ họ đã từng gửi trước khi nhóm tắt phê duyệt)
      if (group.joinRequests) {
        group.joinRequests = group.joinRequests.filter(
          (r) => r.userId.toString() !== requesterId,
        );
      }

      await group.save();

      // Bắn tin nhắn hệ thống khi user trực tiếp join
      const requesterName = await getUserFullName(
        requesterId,
        req.headers.authorization,
      );
      await postSystemMessage(
        String(groupId),
        String(requesterId),
        `${requesterName} đã tham gia nhóm`,
        req.headers.authorization,
      );

      rabbitMQProducer.publishGroupUpdated(group).catch(console.error);
      res.status(200).json({
        message: "Đã tham gia nhóm thành công",
        joined: true,
        data: group,
      });
      return;
    }

    if (!group.joinRequests) {
      group.joinRequests = [];
    }

    const { answer } = req.body || {};

    group.joinRequests.push({
      userId: requesterId,
      requestedAt: new Date(),
      answer: answer || "",
    });
    await group.save();

    // Bắn tin cho admin
    try {
      const requesterName = await getUserFullName(
        requesterId,
        req.headers.authorization,
      );
      const admins = group.members
        .filter((m: any) => m.role === "LEADER" || m.role === "DEPUTY")
        .map((m: any) => m.userId);

      rabbitMQProducer
        .publishNewJoinRequest(groupId, requesterName, admins, group.name)
        .catch(console.error);

      rabbitMQProducer.publishGroupUpdated(group).catch(console.error);
    } catch (notifErr) {
      console.error("[RequestJoinGroup] Notification Error:", notifErr);
    }

    res.status(200).json({
      message: "Đã gửi yêu cầu tham gia, vui lòng chờ duyệt",
      joined: false,
      data: group.joinRequests,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 9. Lấy danh sách yêu cầu tham gia (Chỉ LEADER/DEPUTY)
export const getJoinRequests = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = String(req.params.groupId || "");
    const requesterId = String(req.headers["x-user-id"] || "");

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Không tìm thấy nhóm" });
      return;
    }

    // Check permissions
    const member = group.members.find(
      (m) => m.userId.toString() === requesterId,
    );
    if (!member || (member.role !== "LEADER" && member.role !== "DEPUTY")) {
      res
        .status(403)
        .json({ error: "Bạn không có quyền xem yêu cầu tham gia" });
      return;
    }

    res.status(200).json({ data: group.joinRequests || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 10. Phê duyệt yêu cầu tham gia (Chỉ LEADER/DEPUTY)
export const approveJoinRequest = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = String(req.params.groupId || "");
    const userId = String(req.params.userId || "");
    const requesterId = String(req.headers["x-user-id"] || "");

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Không tìm thấy nhóm" });
      return;
    }

    const member = group.members.find(
      (m) => m.userId.toString() === requesterId,
    );
    if (!member || (member.role !== "LEADER" && member.role !== "DEPUTY")) {
      res.status(403).json({ error: "Bạn không có quyền phê duyệt" });
      return;
    }

    const requests = group.joinRequests || [];
    const requestIndex = requests.findIndex(
      (r) => r.userId.toString() === String(userId),
    );
    if (requestIndex === -1) {
      res
        .status(404)
        .json({ error: "Không tìm thấy yêu cầu tham gia của người dùng này" });
      return;
    }

    // Remove from joinRequests
    requests.splice(requestIndex, 1);
    group.joinRequests = requests;

    // Add to members if not already
    const isMember = group.members.some(
      (m) => m.userId.toString() === String(userId),
    );
    if (!isMember && userId) {
      group.members.push({
        userId: String(userId),
        role: "MEMBER",
        joinedAt: group.isHistoryVisible
          ? group.createdAt || new Date()
          : new Date(),
      });
    }

    await group.save();

    // Real-time Sync: Thông báo cho người vừa được duyệt về hội thoại mới hiển thị
    rabbitMQProducer.publishConversationCreated(group).catch(console.error);
    // Thông báo đẩy (In-app) cho người dùng được duyệt
    rabbitMQProducer
      .publishJoinRequestApproved(userId, group)
      .catch(console.error);

    // Bắn tin nhắn hệ thống
    const targetName = await getUserFullName(userId, req.headers.authorization);
    await postSystemMessage(
      groupId,
      requesterId,
      `${targetName} đã được duyệt vào nhóm`,
      req.headers.authorization,
    );

    rabbitMQProducer.publishGroupUpdated(group).catch(console.error);
    res.status(200).json({ message: "Đã phê duyệt yêu cầu", data: group });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 11. Từ chối yêu cầu tham gia (Chỉ LEADER/DEPUTY)
export const rejectJoinRequest = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = String(req.params.groupId || "");
    const userId = String(req.params.userId || "");
    const requesterId = String(req.headers["x-user-id"] || "");

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Không tìm thấy nhóm" });
      return;
    }

    const member = group.members.find(
      (m) => m.userId.toString() === requesterId,
    );
    if (!member || (member.role !== "LEADER" && member.role !== "DEPUTY")) {
      res.status(403).json({ error: "Bạn không có quyền từ chối" });
      return;
    }

    const requests = group.joinRequests || [];
    const requestIndex = requests.findIndex(
      (r) => r.userId.toString() === String(userId),
    );
    if (requestIndex === -1) {
      res
        .status(404)
        .json({ error: "Không tìm thấy yêu cầu tham gia của người dùng này" });
      return;
    }

    // Remove from joinRequests
    requests.splice(requestIndex, 1);
    group.joinRequests = requests;

    await group.save();

    // Thông báo cho người dùng bị từ chối
    rabbitMQProducer
      .publishJoinRequestRejected(userId, group.name || "Nhóm")
      .catch(console.error);

    rabbitMQProducer.publishGroupUpdated(group).catch(console.error);

    res.status(200).json({ message: "Đã từ chối yêu cầu", data: group });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 12. Cập nhật cài đặt phê duyệt tham gia nhóm (Chỉ LEADER/DEPUTY)
export const updateApprovalSetting = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = String(req.params.groupId || "");
    const { isApprovalRequired } = req.body;
    const requesterId = (req.headers["x-user-id"] || "").toString();

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Không tìm thấy nhóm" });
      return;
    }

    const member = group.members.find(
      (m) => m.userId.toString() === requesterId,
    );
    if (!member || (member.role !== "LEADER" && member.role !== "DEPUTY")) {
      res.status(403).json({
        error:
          "Chỉ Trưởng nhóm hoặc Phó nhóm mới có quyền thay đổi cài đặt này",
      });
      return;
    }

    if (typeof isApprovalRequired !== "boolean") {
      res
        .status(400)
        .json({ error: "Tham số isApprovalRequired không hợp lệ" });
      return;
    }

    group.isApprovalRequired = isApprovalRequired;
    await group.save();
    rabbitMQProducer.publishGroupUpdated(group).catch(console.error);

    res
      .status(200)
      .json({ message: "Cập nhật cài đặt thành công", data: group });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateLinkSetting = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = String(req.params.groupId || "");
    const { isLinkEnabled } = req.body;
    const requesterId = (req.headers["x-user-id"] || "").toString();

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Không tìm thấy nhóm" });
      return;
    }

    const member = group.members.find(
      (m) => m.userId.toString() === requesterId,
    );
    if (!member || (member.role !== "LEADER" && member.role !== "DEPUTY")) {
      res.status(403).json({
        error:
          "Chỉ Trưởng nhóm hoặc Phó nhóm mới có quyền thay đổi cài đặt này",
      });
      return;
    }

    if (typeof isLinkEnabled !== "boolean") {
      res.status(400).json({ error: "Tham số isLinkEnabled không hợp lệ" });
      return;
    }

    group.isLinkEnabled = isLinkEnabled;
    await group.save();
    rabbitMQProducer.publishGroupUpdated(group).catch(console.error);

    res
      .status(200)
      .json({ message: "Cập nhật link nhóm thành công", data: group });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateGroup = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = String(req.params.groupId || "");
    const { name } = req.body;
    const currentUserId = (req.headers["x-user-id"] || "").toString();

    const group = await Conversation.findById(groupId);

    if (!group || !group.isGroup) {
      res.status(404).json({ error: "Không tìm thấy nhóm" });
      return;
    }

    const currentMember = group.members.find(
      (m: any) => m.userId.toString() === currentUserId,
    );

    if (!currentMember) {
      res.status(403).json({ error: "Bạn không phải thành viên của nhóm này" });
      return;
    }

    const editPermission = group.permissions?.editGroupInfo || "ADMIN";
    const isAdmin =
      currentMember.role === "LEADER" || currentMember.role === "DEPUTY";

    if (editPermission === "ADMIN" && !isAdmin) {
      res.status(403).json({
        error: "Chỉ Trưởng nhóm và Phó nhóm mới có quyền cập nhật thông tin",
      });
      return;
    }

    if (name) {
      group.name = name;
    }

    if (req.file) {
      console.log(`[UpdateGroup] Đang upload avatar nhóm lên S3...`);
      const groupAvatarUrl = await uploadImageToS3(
        req.file.buffer,
        req.file.mimetype,
        "alo_group_images",
      );

      // Xoá ảnh cũ (nếu có) trên S3 trước khi gán link mới
      if (group.groupAvatar) {
        await deleteImageFromS3(group.groupAvatar);
      }

      console.log(`[UpdateGroup] Upload thành công URL: ${groupAvatarUrl}`);
      group.groupAvatar = groupAvatarUrl;
    }

    await group.save();

    rabbitMQProducer.publishGroupUpdated(group).catch(console.error);
    res.status(200).json({
      message: "Cập nhật thông tin nhóm thành công",
      data: group,
    });
  } catch (error: any) {
    console.error("[UpdateGroup] Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// 14. Xoá lịch sử trò chuyện (Timestamp-based)
export const clearConversation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { groupId } = req.params;
    const userId = String(req.headers["x-user-id"] || "");

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const conversation = await Conversation.findById(groupId);
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Update clearedAt for this user
    if (!conversation.clearedAt) {
      conversation.clearedAt = new Map();
    }
    conversation.clearedAt.set(userId, new Date());

    await conversation.save();

    res.status(200).json({
      message: "Conversation cleared successfully",
      clearedAt: conversation.clearedAt.get(userId),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getOrCreateDirectConversation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = (req.headers["x-user-id"] || "").toString();

    const existingConversation = await Conversation.findOne({
      isGroup: false,
      $and: [
        { "members.userId": currentUserId },
        { "members.userId": targetUserId },
      ],
    });

    if (existingConversation) {
      res.status(200).json(existingConversation);
      return;
    }

    const newConversation = new Conversation({
      name: "Direct Chat",
      isGroup: false,
      members: [
        { userId: currentUserId, role: "MEMBER" },
        { userId: targetUserId, role: "MEMBER" },
      ],
    });

    await newConversation.save();

    // Real-time Sync: Thông báo cho cả 2 người về cuộc hội thoại mới
    rabbitMQProducer
      .publishConversationCreated(newConversation)
      .catch(console.error);

    res.status(201).json(newConversation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 18. Cập nhật cài đặt xem lịch sử tin nhắn (Chỉ LEADER/DEPUTY)
export const updateHistorySetting = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = String(req.params.groupId || "");
    const { isHistoryVisible } = req.body;
    const requesterId = (req.headers["x-user-id"] || "").toString();

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Không tìm thấy nhóm" });
      return;
    }

    // Check quyền
    const member = group.members.find(
      (m) => m.userId.toString() === requesterId,
    );
    if (!member || (member.role !== "LEADER" && member.role !== "DEPUTY")) {
      res
        .status(403)
        .json({ error: "Bạn không có quyền thay đổi thiết lập này" });
      return;
    }

    if (typeof isHistoryVisible !== "boolean") {
      res.status(400).json({ error: "Tham số isHistoryVisible không hợp lệ" });
      return;
    }

    group.isHistoryVisible = isHistoryVisible;
    await group.save();

    rabbitMQProducer.publishGroupUpdated(group).catch(console.error);

    res.status(200).json({
      message: "Đã cập nhật thiết lập xem lịch sử",
      data: { isHistoryVisible: group.isHistoryVisible },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 19. Admin: Tìm kiếm/Lọc danh sách nhóm (Có phân trang)
export const searchGroupsAdmin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { name, isGroup, isBanned, page = 0, size = 10 } = req.query;

    const query: any = {};

    if (name) {
      const searchStr = name as string;
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(searchStr);

      if (isValidObjectId) {
        query.$or = [
          { _id: searchStr },
          { name: { $regex: searchStr, $options: "i" } },
        ];
      } else {
        query.name = { $regex: searchStr, $options: "i" };
      }
    }

    if (isGroup !== undefined) {
      query.isGroup = isGroup === "true";
    }

    if (isBanned !== undefined) {
      query.isBanned = isBanned === "true";
    }

    const p = Math.max(0, parseInt(page as string, 10));
    const s = Math.max(1, parseInt(size as string, 10));

    const totalElements = await Conversation.countDocuments(query);
    const totalPages = Math.ceil(totalElements / s);

    const groups = await Conversation.find(query)
      .sort({ createdAt: -1 })
      .skip(p * s)
      .limit(s);

    const pageResponse = {
      content: groups,
      page: p,
      size: s,
      totalElements,
      totalPages,
      last: p >= totalPages - 1,
    };

    // The frontend currently expects API standard response: { code: xxx, data: ... }
    // or just the JSON object. Our controller returns res.status(200).json({ data: pageResponse })
    res.status(200).json({ data: pageResponse });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 20. Admin: Ban / Unban Group
export const toggleBanGroupAdmin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = String(req.params.groupId || "");
    const { isBanned } = req.body;

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Không tìm thấy hội thoại / nhóm" });
      return;
    }

    if (typeof isBanned === "boolean") {
      group.isBanned = isBanned;
      await group.save();
    }

    // Thông báo cho mọi người nếu cần
    rabbitMQProducer.publishGroupUpdated(group).catch(console.error);

    res
      .status(200)
      .json({ message: "Cập nhật trạng thái cấm thành công", data: group });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
// 21. Update settings
export const updateSettings = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = String(req.params.groupId || "");
    const {
      isHighlightEnabled,
      permissions,
      membershipQuestion,
      isQuestionEnabled,
    } = req.body;
    const requesterId = (req.headers["x-user-id"] || "").toString();

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Không tìm thấy nhóm" });
      return;
    }

    // Check permissions (Only Leader/Deputy can update these settings)
    const member = group.members.find(
      (m) => m.userId.toString() === requesterId,
    );
    if (!member || (member.role !== "LEADER" && member.role !== "DEPUTY")) {
      res
        .status(403)
        .json({ error: "Bạn không có quyền thay đổi thiết lập này" });
      return;
    }

    if (typeof isHighlightEnabled === "boolean") {
      group.isHighlightEnabled = isHighlightEnabled;
    }

    if (permissions && typeof permissions === "object") {
      // Deep merge or specific assign
      if (permissions.editGroupInfo)
        group.permissions.editGroupInfo = permissions.editGroupInfo;
      if (permissions.createNotes)
        group.permissions.createNotes = permissions.createNotes;
      if (permissions.createPolls)
        group.permissions.createPolls = permissions.createPolls;
      if (permissions.pinMessages)
        group.permissions.pinMessages = permissions.pinMessages;
      if (permissions.sendMessage)
        group.permissions.sendMessage = permissions.sendMessage;
      if (permissions.createReminders)
        group.permissions.createReminders = permissions.createReminders;
    }

    if (typeof membershipQuestion === "string") {
      group.membershipQuestion = membershipQuestion;
    }

    if (typeof isQuestionEnabled === "boolean") {
      group.isQuestionEnabled = isQuestionEnabled;
    }

    await group.save();
    rabbitMQProducer.publishGroupUpdated(group).catch(console.error);

    res.status(200).json({
      message: "Cập nhật thiết lập thành công",
      data: group,
    });
  } catch (error: any) {
    console.error("[updateSettings] Error:", error);
  }
};

// 22. Admin: Lấy thống kê về nhóm
export const getGroupStatsAdmin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // 1. Tổng số nhóm
    const totalGroups = await Conversation.countDocuments({ isGroup: true });

    // 2. Số nhóm tạo trong ngày hôm nay và hôm qua
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const createdToday = await Conversation.countDocuments({
      isGroup: true,
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(endOfToday);
    endOfYesterday.setDate(endOfYesterday.getDate() - 1);

    const createdYesterday = await Conversation.countDocuments({
      isGroup: true,
      createdAt: { $gte: startOfYesterday, $lte: endOfYesterday },
    });

    let createdTodayTrend = 0;
    if (createdYesterday === 0) {
      createdTodayTrend = createdToday > 0 ? 100 : 0;
    } else {
      createdTodayTrend =
        Math.round(
          ((createdToday - createdYesterday) / createdYesterday) * 100 * 10,
        ) / 10;
    }

    // 3. Trung bình số lượng thành viên
    const avgResult = await Conversation.aggregate([
      { $match: { isGroup: true } },
      { $project: { memberCount: { $size: { $ifNull: ["$members", []] } } } },
      { $group: { _id: null, avgMembers: { $avg: "$memberCount" } } },
    ]);

    const avgMembers =
      avgResult.length > 0 ? Math.round(avgResult[0].avgMembers) : 0;

    res.status(200).json({
      data: {
        totalGroups,
        createdToday,
        createdYesterday,
        createdTodayTrend,
        avgMembers,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 12. Cập nhật danh mục (Ưu tiên / Khác)
// 12. Cập nhật danh mục (Ưu tiên / Khác)
export const updateConversationFolder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = String(req.params.groupId || "");
    const { folder } = req.body; // 'priority' or 'other'
    const currentUserId = String(req.headers["x-user-id"] || "");

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Không tìm thấy hội thoại" });
      return;
    }

    // Đảm bảo folders map tồn tại
    if (!group.folders) {
      group.folders = new Map();
    }

    if (!folder || folder === "priority") {
      group.folders.delete(currentUserId);
    } else {
      group.folders.set(currentUserId, folder);
    }

    await group.save();

    // Thông báo cập nhật qua socket/RabbitMQ
    rabbitMQProducer.publishGroupUpdated(group).catch(console.error);

    res.status(200).json({
      message: "Cập nhật danh mục thành công",
      data: group,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 23. Mời vào nhóm (Hỗ trợ mời người chưa kết bạn)
export const inviteToGroup = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = String(req.params.groupId || "").trim();
    if (!groupId || groupId.length !== 24) {
      res.status(400).json({ error: "Mã nhóm không hợp lệ" });
      return;
    }
    const { targetUserId } = req.body;
    const requesterId = String(req.headers["x-user-id"] || "");

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Không tìm thấy nhóm" });
      return;
    }

    // 1. Kiểm tra xem đã là thành viên chưa
    if (group.members.some((m) => m.userId === targetUserId)) {
      res.status(400).json({ error: "Người dùng đã là thành viên của nhóm" });
      return;
    }

    // 2. Kiểm tra ban/block
    const removedInfo = group.removedMembers?.find(
      (rm) => rm.userId === targetUserId,
    );
    if (removedInfo) {
      if (removedInfo.isBanned) {
        res
          .status(403)
          .json({ error: "Người dùng này đã bị cấm tham gia nhóm" });
        return;
      }
      if (removedInfo.preventReinvite) {
        res
          .status(403)
          .json({ error: "Người dùng này đã chặn lời mời vào nhóm này" });
        return;
      }
    }

    // 3. Kiểm tra xem đã mời chưa
    if (!group.invitations) group.invitations = [];
    if (group.invitations.some((inv) => inv.userId === targetUserId)) {
      res.status(400).json({ error: "Đã gửi lời mời cho người dùng này rồi" });
      return;
    }

    // 4. Thêm lời mời
    group.invitations.push({
      userId: targetUserId,
      invitedBy: requesterId,
      invitedAt: new Date(),
    });

    await group.save();

    // Thông báo cho người được mời (Real-time Sync)
    rabbitMQProducer
      .publishAddedToGroup(targetUserId, group)
      .catch(console.error);

    res
      .status(200)
      .json({ message: "Đã gửi lời mời tham gia nhóm", data: group });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 24. Lấy danh sách lời mời của tôi
export const getMyInvitations = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = String(req.headers["x-user-id"] || "");
    const invitations = await Conversation.find({
      "invitations.userId": userId,
    });
    res.status(200).json({ data: invitations });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 25. Chấp nhận lời mời
export const acceptInvitation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = String(req.params.groupId || "");
    const userId = String(req.headers["x-user-id"] || "");

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Không tìm thấy nhóm" });
      return;
    }

    const invitation = group.invitations?.find((inv) => inv.userId === userId);
    if (!invitation) {
      res.status(400).json({ error: "Không tìm thấy lời mời" });
      return;
    }

    // Xóa lời mời
    group.invitations = group.invitations.filter(
      (inv) => inv.userId !== userId,
    );

    // Thêm thành viên
    group.members.push({
      userId,
      role: "MEMBER",
      joinedAt: new Date(),
    });

    await group.save();

    // Thông báo cho mọi người
    rabbitMQProducer.publishConversationCreated(group).catch(console.error);
    rabbitMQProducer.publishGroupUpdated(group).catch(console.error);

    // Bắn tin nhắn hệ thống
    const userName = await getUserFullName(userId, req.headers.authorization);
    await postSystemMessage(
      groupId,
      userId,
      `${userName} đã chấp nhận lời mời tham gia nhóm`,
      req.headers.authorization,
    );

    res
      .status(200)
      .json({ message: "Đã tham gia nhóm thành công", data: group });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 26. Từ chối lời mời
export const declineInvitation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = String(req.params.groupId || "");
    const userId = String(req.headers["x-user-id"] || "");

    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Không tìm thấy nhóm" });
      return;
    }

    group.invitations = group.invitations.filter(
      (inv) => inv.userId !== userId,
    );
    await group.save();

    res.status(200).json({ message: "Đã từ chối lời mời" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
// 27. Lấy danh sách yêu cầu tham gia đã gửi
export const getMySentJoinRequests = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = String(req.headers["x-user-id"] || "");
    const requests = await Conversation.find({
      "joinRequests.userId": userId,
    });
    res.status(200).json({ data: requests });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy danh sách các lời mời vào nhóm mà TÔI ĐÃ GỬI cho người khác
 */
export const getMySentInvitations = async (req: Request, res: Response) => {
  try {
    const requesterId = String(req.headers["x-user-id"] || "");
    if (!requesterId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Tìm các conversation mà trong mảng invitations có invitedBy là requesterId
    const conversations = await Conversation.find({
      "invitations.invitedBy": requesterId,
    }).select("name groupAvatar invitations");

    const sentInvitations: any[] = [];

    conversations.forEach((conv) => {
      const pendingInvites = conv.invitations.filter(
        (inv) => String(inv.invitedBy) === requesterId,
      );
      pendingInvites.forEach((inv) => {
        sentInvitations.push({
          groupId: conv._id,
          groupName: conv.name,
          groupAvatar: conv.groupAvatar,
          invitedUserId: inv.userId,
          invitedAt: inv.invitedAt,
        });
      });
    });

    res.status(200).json({ data: sentInvitations });
  } catch (error) {
    console.error("Lỗi getMySentInvitations:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
