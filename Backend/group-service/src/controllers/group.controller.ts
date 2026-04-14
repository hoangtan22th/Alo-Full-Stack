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

// 1. Tạo Nhóm mới (Tạo nhóm từ 3 người)
export const createGroup = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // Với multipart/form-data, các trường được gửi dưới dạng string trong req.body
    let { name, userIds } = req.body;
    let groupAvatar = "";
    const creatorId = (req.headers["x-user-id"] || "").toString();

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
    const requesterId = (req.headers["x-user-id"] || "").toString();

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

    group.members.push({
      userId: newUserId,
      role: "MEMBER",
      joinedAt: new Date(),
    });
    await group.save();

    // Real-time Sync: Thông báo cho thành viên mới về nhóm này
    rabbitMQProducer.publishConversationCreated(group).catch(console.error);

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
    const requesterId = req.headers["x-user-id"] as string; // Người bấm nút

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

    // TRƯỜNG HỢP 1: TỰ RỜI NHÓM (userId === requesterId)
    if (userId === requesterId) {
      if (requester.role === "LEADER") {
        res.status(400).json({
          error:
            "Trưởng nhóm không thể rời đi. Hãy trao quyền Trưởng nhóm cho người khác trước.",
        });
        return;
      }
      // Cho phép rời nhóm bình thường
    }
    // TRƯỜNG HỢP 2: BỊ KICK (userId !== requesterId)
    else {
      // Chỉ LEADER hoặc DEPUTY mới được kick
      if (requester.role === "MEMBER") {
        res.status(403).json({ error: "Bạn không có quyền kick thành viên" });
        return;
      }
      // DEPUTY không thể kick LEADER hoặc DEPUTY khác
      if (requester.role === "DEPUTY" && target.role !== "MEMBER") {
        res
          .status(403)
          .json({ error: "Phó nhóm chỉ có thể kick Thành viên thường" });
        return;
      }
    }

    // Thực hiện xóa
    group.members = group.members.filter((m) => m.userId !== userId);
    await group.save();

    // Real-time Sync: Thông báo cho người bị gỡ rằng họ không còn trong nhóm
    rabbitMQProducer.publishConversationRemoved(groupId, userId).catch(console.error);

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
    const { groupId, userId } = req.params;
    const { newRole } = req.body;
    const requesterId = req.headers["x-user-id"] as string;

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
    const { groupId, newLeaderId } = req.body;
    const currentLeaderId = req.headers["x-user-id"] as string;

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
          rabbitMQProducer.publishConversationRemoved(groupId, String(member.userId)).catch(console.error);
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
    const currentUserId = req.headers["x-user-id"] as string;
    const type = req.query.type as string;

    const query: any = {
      "members.userId": currentUserId,
    };

    if (type !== "all") {
      query.isGroup = true;
    }

    const groups = await Conversation.find(query).sort({ updatedAt: -1 });

    res.status(200).json({ data: groups });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getGroupById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = String(req.params.groupId || "");
    const group = await Conversation.findById(groupId);
    if (!group) {
      res.status(404).json({ error: "Không tìm thấy nhóm" });
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
    const groupId = String(req.params.groupId || "");
    const requesterId = (req.headers["x-user-id"] || "").toString();

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

    // Nếu nhóm không bật phê duyệt thì cho tham gia trực tiếp
    if (!group.isApprovalRequired) {
      group.members.push({
        userId: requesterId,
        role: "MEMBER",
        joinedAt: new Date(),
      });

      // Xoá join requests nếu lỡ có trễ (ví dụ họ đã từng gửi trước khi nhóm tắt phê duyệt)
      if (group.joinRequests) {
        group.joinRequests = group.joinRequests.filter(
          (r) => r.userId.toString() !== requesterId,
        );
      }

      await group.save();
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

    group.joinRequests.push({ userId: requesterId, requestedAt: new Date() });
    await group.save();

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
    const requesterId = (req.headers["x-user-id"] || "").toString();

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
        joinedAt: new Date(),
      });
    }

    await group.save();

    // Real-time Sync: Thông báo cho người vừa được duyệt về hội thoại mới hiển thị
    rabbitMQProducer.publishConversationCreated(group).catch(console.error);

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
      res.status(403).json({
        error: "Bạn không có quyền cập nhật thông tin nhóm này",
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

    res.status(200).json({
      message: "Cập nhật thông tin nhóm thành công",
      data: group,
    });
  } catch (error: any) {
    console.error("[UpdateGroup] Error:", error);
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
    rabbitMQProducer.publishConversationCreated(newConversation).catch(console.error);

    res.status(201).json(newConversation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
