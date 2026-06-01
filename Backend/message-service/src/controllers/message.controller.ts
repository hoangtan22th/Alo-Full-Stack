import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { Message } from "../models/Message.js";
import messageDataService from "../services/message.service.js";
import { uploadFileToS3 } from "../services/s3Service.js";
import rabbitMQProducer from "../services/RabbitMQProducerService.js";
import { MessageEvent } from "../types/events.js";
// @ts-ignore
import convert from "heic-convert";

/**
 * Extract userId from x-user-id header (set by Gateway)
 */
function getUserIdFromHeader(req: Request): string | null {
  const userId = req.headers["x-user-id"];
  return typeof userId === "string" ? userId : null;
}

/**
 * Helper to fetch conversation info from group-service
 */
async function getConversation(
  req: Request,
  conversationId: string,
  userId: string,
): Promise<any> {
  try {
    // Call group-service directly to bypass Gateway JWT requirements for internal service-to-service calls
    const groupServiceUrl = process.env.GROUP_SERVICE_URL || "http://127.0.0.1:8082/api/v1/groups";
    // Ensure we don't double the /api/v1/groups path if it's already in the env var
    const baseUrl = groupServiceUrl.endsWith('/api/v1/groups') ? groupServiceUrl : `${groupServiceUrl}/api/v1/groups`;
    const url = `${baseUrl}/${conversationId}`;
    
    const response = await fetch(
      url,
      {
        headers: {
          "X-User-Id": userId,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      console.warn(`[getConversation] Fetch failed for ${conversationId}: ${response.status} ${response.statusText}`);
      return null;
    }
    const result = await response.json();
    // Handle both { data: ... } wrapped and unwrapped responses
    const conversation = result?.data || result;
    
    if (!conversation || !conversation._id) {
      console.warn(`[getConversation] Invalid conversation data received for ${conversationId}`, result);
      return null;
    }
    
    return conversation;
  } catch (error: any) {
    console.error(`[getConversation] Exception fetching conversation ${conversationId}:`, error.message);
    return null;
  }
}

/**
 * Helper to check if a user has permission to perform an action in a conversation
 */
async function hasGroupPermission(
  req: Request,
  conversationId: string,
  userId: string,
  action: "pinMessages" | "sendMessage" | "createPolls" | "createNotes" | "createReminders" | "editGroupInfo",
): Promise<boolean> {
  const conversation = await getConversation(req, conversationId, userId);
  if (!conversation) return false;

  // Direct matches (1-1) always allow all actions
  if (!conversation.isGroup) return true;

  // Permissions check
  const permission = conversation.permissions?.[action] || "EVERYONE";
  if (permission === "EVERYONE") return true;

  // For ADMIN only, check if the user is LEADER or DEPUTY
  const member = conversation.members?.find(
    (m: any) => String(m.userId) === userId,
  );
  const role = member?.role?.toUpperCase();
  return role === "LEADER" || role === "DEPUTY";
}

/**
 * Ghim tin nhắn
 */
export async function pinMessage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { messageId } = req.params;
    const userId = getUserIdFromHeader(req);

    if (!messageId || typeof messageId !== "string") {
      res.status(400).json({ error: "Missing or invalid messageId" });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // 1. Lấy thông tin tin nhắn để biết conversationId
    const message = await messageDataService.getMessageById(messageId);
    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    // 2. Kiểm tra quyền ghim
    const allowed = await hasGroupPermission(
      req,
      message.conversationId.toString(),
      userId,
      "pinMessages",
    );
    if (!allowed) {
      res.status(403).json({ error: "Bạn không có quyền ghim tin nhắn" });
      return;
    }

    const updated = await messageDataService.pinMessage(messageId);
    if (!updated) {
      res.status(404).json({ error: "Failed to update pin status" });
      return;
    }

    // Phát sự kiện realtime
    await rabbitMQProducer.publishMessagePinEvent({
      messageId: updated._id.toString(),
      conversationId: updated.conversationId.toString(),
      isPinned: true,
      pinnedAt: new Date().toISOString(),
      message: updated,
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

/**
 * Bỏ ghim tin nhắn
 */
export async function unpinMessage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { messageId } = req.params;
    const userId = getUserIdFromHeader(req);

    if (!messageId || typeof messageId !== "string") {
      res.status(400).json({ error: "Missing or invalid messageId" });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // 1. Lấy thông tin tin nhắn để biết conversationId
    const message = await messageDataService.getMessageById(messageId);
    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    // 2. Kiểm tra quyền bỏ ghim
    const allowed = await hasGroupPermission(
      req,
      message.conversationId.toString(),
      userId,
      "pinMessages",
    );
    if (!allowed) {
      res.status(403).json({ error: "Bạn không có quyền bỏ ghim tin nhắn" });
      return;
    }

    const updated = await messageDataService.unpinMessage(messageId);
    if (!updated) {
      res.status(404).json({ error: "Failed to update pin status" });
      return;
    }

    // Phát sự kiện realtime
    await rabbitMQProducer.publishMessagePinEvent({
      messageId: updated._id.toString(),
      conversationId: updated.conversationId.toString(),
      isPinned: false,
      pinnedAt: new Date().toISOString(),
      message: updated,
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

/**
 * Get message history for a conversation
 */
export async function getMessageHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { conversationId } = req.params;

    // Typeof Check: Đảm bảo conversationId là string
    if (typeof conversationId !== "string") {
      res.status(400).json({ error: "Invalid or missing conversationId" });
      return;
    }

    const limit = Math.min(
      Math.max(parseInt(req.query.limit as string) || 50, 1),
      100,
    );
    const skip = Math.max(parseInt(req.query.skip as string) || 0, 0);
    const type = req.query.type as string | undefined;
    const userId = getUserIdFromHeader(req);

    if (!userId) {
      res.status(401).json({ error: "Unauthorized - no user id" });
      return;
    }

    // 0. Gọi sang group-service để lấy thông tin clearedAt và joinedAt
    let clearedAt: Date | undefined = undefined;
    let joinedAt: Date | undefined = undefined;
    try {
      const groupServiceUrl = process.env.GROUP_SERVICE_URL || "http://127.0.0.1:8082/api/v1/groups";
      const baseUrl = groupServiceUrl.endsWith('/api/v1/groups') ? groupServiceUrl : `${groupServiceUrl}/api/v1/groups`;
      const url = `${baseUrl}/${conversationId}`;

      const response = await fetch(
        url,
        {
          headers: {
            "X-User-Id": userId,
            "Content-Type": "application/json",
          },
        },
      );
      if (response.ok) {
        const result = await response.json();
        const conversation = result.data;
        if (conversation) {
          // Lấy clearedAt
          if (conversation.clearedAt && conversation.clearedAt[userId]) {
            clearedAt = new Date(conversation.clearedAt[userId]);
          }
          // Lấy joinedAt
          if (Array.isArray(conversation.members)) {
            const member = conversation.members.find(
              (m: any) => String(m.userId) === userId,
            );
            if (member && member.joinedAt) {
              joinedAt = new Date(member.joinedAt);
            }
          }
        }
      }
    } catch (err) {
      console.warn(
        "[MessageController] Failed to fetch conversation info from group-service:",
        err,
      );
    }

    const messages = await messageDataService.getMessageHistory(
      conversationId,
      userId,
      limit,
      skip,
      clearedAt,
      type,
      joinedAt,
    );

    res.json({
      conversationId,
      messages,
      count: messages.length,
      limit,
      skip,
      hasMore: messages.length === limit,
    });
  } catch (error) {
    console.error("[MessageController] GET history error:", error);
    next(error);
  }
}

/**
 * Get unread message count
 */
export async function getUnreadCount(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { conversationId } = req.params;
    const userId = getUserIdFromHeader(req);

    // Typeof Check cho params
    if (typeof conversationId !== "string") {
      res.status(400).json({ error: "Invalid or missing conversationId" });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "Unauthorized - no user id" });
      return;
    }

    const count = await messageDataService.getUnreadCount(
      conversationId,
      userId,
    );

    res.json({
      conversationId,
      unreadCount: count,
    });
  } catch (error) {
    console.error("[MessageController] GET unread-count error:", error);
    next(error);
  }
}

/**
 * Mark message as read
 */
export async function markAsRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { messageId } = req.params;
    const userId = getUserIdFromHeader(req);

    // Typeof Check cho params
    if (typeof messageId !== "string") {
      res.status(400).json({ error: "Invalid or missing messageId" });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "Unauthorized - no user id" });
      return;
    }

    await messageDataService.markAsRead([messageId], userId);

    res.json({
      status: "success",
      messageId,
    });
  } catch (error) {
    console.error("[MessageController] PUT read error:", error);
    next(error);
  }
}

/**
 * Edit message
 */
export async function editMessage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = getUserIdFromHeader(req);

    // Typeof Check cho params
    if (typeof messageId !== "string") {
      res.status(400).json({ error: "Invalid or missing messageId" });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "Unauthorized - no user id" });
      return;
    }

    if (typeof content !== "string" || content.trim() === "") {
      res.status(400).json({ error: "Content must be a non-empty string" });
      return;
    }

    const isOwner = await messageDataService.isMessageOwner(messageId, userId);
    if (!isOwner) {
      res
        .status(403)
        .json({ error: "Forbidden - you are not the message owner" });
      return;
    }

    const updated = await messageDataService.editMessage(messageId, content);

    res.json({
      status: "success",
      message: updated,
    });
  } catch (error) {
    console.error("[MessageController] PUT edit error:", error);
    next(error);
  }
}

/**
 * Revoke message (soft delete for everyone)
 */
export async function revokeMessage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { messageId } = req.params;
    const userId = getUserIdFromHeader(req);

    // Typeof Check cho params
    if (typeof messageId !== "string") {
      res.status(400).json({ error: "Invalid or missing messageId" });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "Unauthorized - no user id" });
      return;
    }
    const message = await messageDataService.getMessageById(messageId);
    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    if (String(message.senderId) !== userId) {
      res
        .status(403)
        .json({ error: "Forbidden - you are not the message owner" });
      return;
    }

    // Check 24h limit (86400000 ms)
    const timeDiff = Date.now() - new Date(message.createdAt).getTime();
    if (timeDiff > 86400000) {
      res.status(400).json({
        error: "Chỉ có thể thu hồi tin nhắn trong vòng 24 giờ kể từ khi gửi",
      });
      return;
    }

    const updatedMessage = await messageDataService.revokeMessage(messageId);

    if (updatedMessage) {
      await rabbitMQProducer.publishMessageRevokedEvent({
        messageId,
        conversationId: updatedMessage.conversationId.toString(),
      });
    }

    res.json({
      status: "success",
      messageId,
    });
  } catch (error) {
    console.error("[MessageController] REVOKE error:", error);
    next(error);
  }
}

/**
 * Delete message for me only
 */
export async function deleteMessageForMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { messageId } = req.params;
    const userId = getUserIdFromHeader(req);

    if (typeof messageId !== "string") {
      res.status(400).json({ error: "Invalid or missing messageId" });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    await messageDataService.deleteMessageForMe(messageId, userId);

    res.json({
      status: "success",
      messageId,
    });
  } catch (error) {
    console.error("[MessageController] DELETE for me error:", error);
    next(error);
  }
}

/**
 * Send a new message
 */
export async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { conversationId, type, content, metadata, replyTo, senderName } =
      req.body;
    const userId = getUserIdFromHeader(req);
    
    console.log(`[MessageService] sendMessage: Received request. Sender: ${userId}, Target: ${req.body.targetUserId || 'N/A'}, ConvoId: ${conversationId || 'N/A'}`);
    console.log(`[MessageService] sendMessage: Content snippet: "${content?.substring(0, 50)}..."`);

    if (!userId) {
      res.status(401).json({ error: "Unauthorized - no user id" });
      return;
    }

    const { targetUserId } = req.body;
    let actualConversationId = conversationId;

    // Support targetUserId for auto-creating direct chats (useful for System DMs)
    if (!actualConversationId && targetUserId) {
      try {
        const groupServiceUrl = process.env.GROUP_SERVICE_URL || "http://127.0.0.1:8082/api/v1/groups";
        const baseUrl = groupServiceUrl.endsWith('/api/v1/groups') ? groupServiceUrl : `${groupServiceUrl}/api/v1/groups`;
        
        const convoRes = await fetch(`${baseUrl}/direct`, {
          method: 'POST',
          headers: { 'X-User-Id': userId, 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId })
        });
        
        if (convoRes.ok) {
          const convoData = await convoRes.json();
          actualConversationId = convoData?.data?._id || convoData?._id;
        }
      } catch (err) {
        console.error("[MessageService] Failed to get/create direct conversation:", err);
      }
    }

    if (!actualConversationId || (!content && type !== "image" && type !== "file")) {
      res.status(400).json({ error: "Missing conversationId/targetUserId or content" });
      return;
    }

    // 0. Kiểm tra quyền nhắn tin & Lấy info conversation
    console.log(`[MessageService] sendMessage: Checking conversation ${actualConversationId} for user ${userId}`);
    const conversation = await getConversation(req, String(actualConversationId), userId);
    if (!conversation) {
      console.warn(`[MessageService] sendMessage: Conversation ${actualConversationId} NOT FOUND for user ${userId}`);
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    console.log(`[MessageService] sendMessage: Found conversation ${conversation._id}, isGroup=${conversation.isGroup}`);

    const permission = conversation.isGroup ? (conversation.permissions?.sendMessage || "EVERYONE") : "EVERYONE";
    let allowed = true;
    if (conversation.isGroup && permission !== "EVERYONE") {
      const member = conversation.members?.find((m: any) => String(m.userId) === userId);
      const role = member?.role?.toUpperCase();
      allowed = role === "LEADER" || role === "DEPUTY";
    }

    if (!allowed) {
      res.status(403).json({
        error: "Chỉ trưởng/phó nhóm mới có thể gửi tin nhắn trong nhóm này",
      });
      return;
    }

    // 1. Lưu vào Database
    const messageDoc = await messageDataService.createMessage({
      conversationId: actualConversationId,
      senderId: userId,
      senderName: senderName,
      type: type || "text",
      content: content || "",
      metadata: metadata || {},
      replyTo: replyTo,
    });

    // 2. Chuẩn bị event để bắn sang RabbitMQ
    const messageEvent: MessageEvent = {
      _id: messageDoc._id.toString(),
      conversationId: String(actualConversationId),
      senderId: userId,
      type: messageDoc.type,
      content: messageDoc.content,
      isRead: false,
      createdAt: messageDoc.createdAt,
      isGroup: conversation.isGroup,
      ...(messageDoc.senderName && { senderName: messageDoc.senderName }),
      ...(messageDoc.metadata && { metadata: messageDoc.metadata }),
      ...(messageDoc.replyTo && { replyTo: messageDoc.replyTo as any }),
    };

    // 3. Đẩy sang RabbitMQ cho Realtime Service tiêu thụ
    await rabbitMQProducer.publishMessageEvent(messageEvent);

    // 4. Trả về kết quả cho Client
    res.status(201).json({
      status: "success",
      data: messageEvent,
    });

    // 5. Chạy kiểm duyệt tin nhắn bằng AI ở chế độ nền (bất đồng bộ, không chặn client)
    if (!type || type === "text") {
      const contentStr = content || "";
      if (SENSITIVE_KEYWORDS_REGEX.test(contentStr)) {
        console.log(`[MessageService AI Moderation] Message matched sensitive keyword rules. Triggering AI scan for: "${contentStr.substring(0, 30)}..."`);
        runAIModeration(messageEvent).catch((err) => {
          console.error("[MessageController] Background AI moderation triggered error:", err);
        });
      } else {
        console.log(`[MessageService AI Moderation] Message does not match sensitive keyword rules. Skipping AI scan.`);
      }
    }
  } catch (error) {
    console.error("[MessageController] POST sendMessage error:", error);
    next(error);
  }
}

/**
 * Sensitive keywords pre-filter regex pattern.
 */
const SENSITIVE_KEYWORDS_REGEX = new RegExp(
  "(" +
  "otp|mã\\s*otp|ma\\s*otp|cung\\s*cấp\\s*otp|cung\\s*cap\\s*otp|gửi\\s*otp|gui\\s*otp|nhập\\s*otp|nhap\\s*otp|" +
  "trúng\\s*thưởng|nhận\\s*thưởng|trung\\s*thuong|nhan\\s*thuong|quà\\s*miễn\\s*phí|qua\\s*mien\\s*phi|quà\\s*tri\\s*ân|qua\\s*tri\\s*an|" +
  "chuyển\\s*tiền\\s*gấp|chuyen\\s*tien\\s*gap|mượn\\s*tiền\\s*gấp|muon\\s*tien\\s*gap|nạp\\s*thẻ\\s*cào|nap\\s*the\\s*cao|" +
  "phạt\\s*nguội|phat\\s*nguoi|công\\s*an|cong\\s*an|tòa\\s*án|toa\\s*an|viện\\s*kiểm\\s*sát|vien\\s*kiem\\s*sat|cục\\s*thuế|cuc\\s*thue|" +
  "việc\\s*nhẹ\\s*lương\\s*cao|viec\\s*nhe\\s*luong\\s*cao|kiếm\\s*tiền\\s*online|kiem\\s*tien\\s*online|tuyển\\s*dụng\\s*gấp|tuyen\\s*dung\\s*gap|tuyển\\s*cộng\\s*tác\\s*viên|tuyen\\s*cong\\s*tac\\s*vien" +
  ")",
  "i"
);

/**
 * Run AI Moderation asynchronously in the background.
 */
async function runAIModeration(messageEvent: any): Promise<void> {
  if (messageEvent.type !== "text" || !messageEvent.content) {
    return;
  }

  try {
    const chatbotServiceUrl = process.env.CHATBOT_SERVICE_URL || "http://localhost:8085";
    const baseUrl = chatbotServiceUrl.endsWith("/") 
      ? chatbotServiceUrl.slice(0, -1) 
      : chatbotServiceUrl;
    const url = `${baseUrl}/api/v1/chatbot/moderate`;

    console.log(`[MessageService AI Moderation] Sending message ${messageEvent._id} to chatbot-service for scanning...`);

    const payload = {
      messageId: messageEvent._id,
      senderId: messageEvent.senderId,
      senderName: messageEvent.senderName || "Unknown User",
      content: messageEvent.content,
      type: messageEvent.type,
      conversationId: messageEvent.conversationId,
      isGroup: !!messageEvent.isGroup,
      timestamp: messageEvent.createdAt ? new Date(messageEvent.createdAt).toISOString() : new Date().toISOString()
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`[MessageService AI Moderation] Failed to moderate message ${messageEvent._id}: ${response.status} ${response.statusText}`);
      return;
    }

    const result = await response.json();
    console.log(`[MessageService AI Moderation] Scan completed for message ${messageEvent._id}:`, result?.data);
  } catch (err: any) {
    console.error(`[MessageService AI Moderation] Exception in background moderation thread for message ${messageEvent._id}:`, err.message);
  }
}


/**
 * Helper to convert HEIC to JPG if needed
 */
async function convertHeicToJpgIfNeeded(
  file: Express.Multer.File,
): Promise<Express.Multer.File> {
  const extension = file.originalname.split(".").pop()?.toLowerCase();
  const isHeic =
    file.mimetype === "image/heic" ||
    file.mimetype === "image/heif" ||
    extension === "heic" ||
    extension === "heif";

  if (isHeic) {
    try {
      console.log(`[HeicConverter] Converting HEIC to JPG: ${file.originalname}`);
      const outputBuffer = await convert({
        buffer: file.buffer,
        format: "JPEG",
        quality: 0.85,
      });

      const lastDotIndex = file.originalname.lastIndexOf(".");
      const baseName =
        lastDotIndex !== -1
          ? file.originalname.substring(0, lastDotIndex)
          : file.originalname;
      const newName = `${baseName}.jpg`;

      return {
        fieldname: file.fieldname,
        originalname: newName,
        encoding: file.encoding,
        mimetype: "image/jpeg",
        size: outputBuffer.length,
        destination: file.destination,
        filename: file.filename,
        path: file.path,
        buffer: outputBuffer as Buffer,
        stream: file.stream,
      };
    } catch (err) {
      console.error(`[HeicConverter] Failed to convert HEIC image:`, err);
    }
  }
  return file;
}

/**
 * Upload a file and create a message
 */
export async function uploadFile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { conversationId, replyTo, senderName } = req.body;
    const userId = getUserIdFromHeader(req);
    let file = req.file;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized - no user id" });
      return;
    }

    if (!conversationId || !file) {
      res.status(400).json({ error: "Missing conversationId or file" });
      return;
    }

    file = await convertHeicToJpgIfNeeded(file);

    // 0. Kiểm tra quyền nhắn tin & Lấy info
    const conversation = await getConversation(req, String(conversationId), userId);
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const permission = conversation.isGroup ? (conversation.permissions?.sendMessage || "EVERYONE") : "EVERYONE";
    let allowed = true;
    if (conversation.isGroup && permission !== "EVERYONE") {
      const member = conversation.members?.find((m: any) => String(m.userId) === userId);
      const role = member?.role?.toUpperCase();
      allowed = role === "LEADER" || role === "DEPUTY";
    }

    if (!allowed) {
      res.status(403).json({
        error: "Chỉ trưởng/phó nhóm mới có thể gửi tin nhắn trong nhóm này",
      });
      return;
    }

    // Fix Vietnamese encoding for originalname (multer sometimes misinterprets UTF-8 as Latin-1)
    const originalName = Buffer.from(file.originalname, "latin1").toString(
      "utf8",
    );

    // 1. Upload to S3
    const fileUrl = await uploadFileToS3(
      file.buffer,
      file.mimetype,
      originalName,
    );

    // 2. Determine message type
    const isImage = file.mimetype.startsWith("image/");
    const type = isImage ? "image" : "file";

    // 3. Save to Database
    const messageDoc = await messageDataService.createMessage({
      conversationId,
      senderId: userId,
      senderName: senderName,
      type,
      content: fileUrl, // For files, content is the URL
      metadata: {
        fileName: originalName,
        fileSize: file.size,
        fileType: file.mimetype,
      },
      replyTo: replyTo ? JSON.parse(replyTo) : undefined,
    });

    // 4. Prepare event for RabbitMQ
    const messageEvent: MessageEvent = {
      _id: messageDoc._id.toString(),
      conversationId: String(conversationId),
      senderId: userId,
      type: messageDoc.type,
      content: messageDoc.content,
      isRead: false,
      createdAt: messageDoc.createdAt,
      isGroup: conversation.isGroup,
      ...(messageDoc.senderName && { senderName: messageDoc.senderName }),
      ...(messageDoc.metadata && { metadata: messageDoc.metadata }),
      ...(messageDoc.replyTo && { replyTo: messageDoc.replyTo as any }),
    };

    // 5. Publish to RabbitMQ
    await rabbitMQProducer.publishMessageEvent(messageEvent);

    // 4. Trả về kết quả cho Client
    res.status(201).json({
      status: "success",
      data: messageEvent,
    });
  } catch (error) {
    console.error("[MessageController] POST uploadFile error:", error);
    next(error);
  }
}

/**
 * Upload files to S3 WITHOUT creating messages (for reports, profile, etc.)
 */
export async function uploadRawFiles(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files provided" });
      return;
    }

    const uploadPromises = files.map(async (file) => {
      const convertedFile = await convertHeicToJpgIfNeeded(file);
      // Fix Vietnamese encoding for originalname
      const originalName = Buffer.from(convertedFile.originalname, "latin1").toString("utf8");
      
      // Upload to S3
      const fileUrl = await uploadFileToS3(
        convertedFile.buffer,
        convertedFile.mimetype,
        originalName
      );
      
      return fileUrl;
    });

    const urls = await Promise.all(uploadPromises);

    res.status(201).json({
      status: "success",
      data: urls,
    });
  } catch (error) {
    console.error("[MessageController] POST uploadRawFiles error:", error);
    next(error);
  }
}

/**
 * Đánh dấu đã xem tất cả tin nhắn trong một cuộc hội thoại
 */
export async function markMessagesAsRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { conversationId } = req.params;
    const userId = getUserIdFromHeader(req);

    if (typeof conversationId !== "string") {
      res.status(400).json({ error: "Invalid or missing conversationId" });
      return;
    }

    if (!conversationId) {
      res
        .status(400)
        .json({ status: "error", message: "Thiếu conversationId" });
      return;
    }

    if (!userId) {
      res.status(401).json({ status: "error", message: "Unauthorized" });
      return;
    }

    const modifiedCount = await messageDataService.markConversationAsRead(
      conversationId,
      userId,
    );

    // Gửi sự kiện qua RabbitMQ để realtime-service báo cho đối phương (người gửi)
    if (modifiedCount > 0) {
      await rabbitMQProducer.publishMessageReadEvent({
        conversationId,
        userId,
        timestamp: new Date(),
      });
    }

    res.status(200).json({
      status: "success",
      data: { modifiedCount },
    });
  } catch (error) {
    console.error("[MessageController] PATCH markMessagesAsRead error:", error);
    next(error);
  }
}

/**
 * Thả cảm xúc hoặc tăng số lượng (Spam)
 */
export async function reactToMessage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = getUserIdFromHeader(req);

    if (typeof messageId !== "string") {
      res.status(400).json({ error: "Invalid or missing messageId" });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!messageId || !emoji) {
      res.status(400).json({ error: "Missing messageId or emoji" });
      return;
    }

    const updatedMessage = await messageDataService.addReaction(
      messageId,
      userId,
      emoji,
    );

    if (updatedMessage) {
      // Bắn sự kiện realtime
      await rabbitMQProducer.publishReactionUpdateEvent({
        messageId: messageId as string,
        conversationId: updatedMessage.conversationId.toString(),
        reactions: updatedMessage.reactions,
      });
    }

    res.json({
      status: "success",
      data: updatedMessage?.reactions || [],
    });
  } catch (error) {
    console.error("[MessageController] POST reactToMessage error:", error);
    next(error);
  }
}

/**
 * Xóa toàn bộ cảm xúc của user trên tin nhắn
 */
export async function clearReactions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { messageId } = req.params;
    const userId = getUserIdFromHeader(req);

    if (typeof messageId !== "string") {
      res.status(400).json({ error: "Invalid or missing messageId" });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const updatedMessage = await messageDataService.clearReactions(
      messageId,
      userId,
    );

    if (updatedMessage) {
      // Bắn sự kiện realtime
      await rabbitMQProducer.publishReactionUpdateEvent({
        messageId: messageId,
        conversationId: updatedMessage.conversationId.toString(),
        reactions: updatedMessage.reactions,
      });
    }

    res.json({
      status: "success",
      data: updatedMessage?.reactions || [],
    });
  } catch (error) {
    console.error("[MessageController] DELETE clearReactions error:", error);
    next(error);
  }
}

/**
 * Upload multiple images and create an album message
 */
export async function uploadImages(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { conversationId, replyTo, senderName, widths, heights } = req.body;
    const userId = getUserIdFromHeader(req);
    const files = req.files as Express.Multer.File[];

    if (!userId) {
      res.status(401).json({ error: "Unauthorized - no user id" });
      return;
    }

    if (
      !conversationId ||
      !files ||
      !Array.isArray(files) ||
      files.length === 0
    ) {
      res.status(400).json({ error: "Missing conversationId or images" });
      return;
    }

    // 0. Kiểm tra quyền nhắn tin & Lấy info
    const conversation = await getConversation(req, String(conversationId), userId);
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const permission = conversation.isGroup ? (conversation.permissions?.sendMessage || "EVERYONE") : "EVERYONE";
    let allowed = true;
    if (conversation.isGroup && permission !== "EVERYONE") {
      const member = conversation.members?.find((m: any) => String(m.userId) === userId);
      const role = member?.role?.toUpperCase();
      allowed = role === "LEADER" || role === "DEPUTY";
    }

    if (!allowed) {
      res.status(403).json({
        error: "Chỉ trưởng/phó nhóm mới có thể gửi tin nhắn trong nhóm này",
      });
      return;
    }

    const parsedWidths =
      typeof widths === "string" ? JSON.parse(widths) : widths;
    const parsedHeights =
      typeof heights === "string" ? JSON.parse(heights) : heights;

    // 1. Upload all to S3 concurrently
    const uploadPromises = files.map(async (file, index) => {
      const convertedFile = await convertHeicToJpgIfNeeded(file);
      const originalName = Buffer.from(convertedFile.originalname, "latin1").toString(
        "utf8",
      );
      const url = await uploadFileToS3(
        convertedFile.buffer,
        convertedFile.mimetype,
        originalName,
      );
      return {
        url,
        width: parsedWidths ? parsedWidths[index] : 0,
        height: parsedHeights ? parsedHeights[index] : 0,
        fileName: originalName,
        fileSize: convertedFile.size,
        fileType: convertedFile.mimetype,
        isRevoked: false,
        deletedByUsers: [],
      };
    });

    const imageGroup = await Promise.all(uploadPromises);

    // 2. Save Message with imageGroup metadata
    const messageDoc = await messageDataService.createMessage({
      conversationId,
      senderId: userId,
      senderName: senderName,
      type: "image",
      content: "[Album Ảnh]",
      metadata: {
        imageGroup: imageGroup,
      },
      replyTo: replyTo ? JSON.parse(replyTo) : undefined,
    });

    // 3. Prepare event for RabbitMQ
    const messageEvent: MessageEvent = {
      _id: messageDoc._id.toString(),
      conversationId: String(conversationId),
      senderId: userId,
      senderName: messageDoc.senderName || "",
      type: messageDoc.type,
      content: messageDoc.content,
      isRead: false,
      createdAt: messageDoc.createdAt,
      isGroup: conversation.isGroup,
      ...(messageDoc.metadata && { metadata: messageDoc.metadata }),
      ...(messageDoc.replyTo && { replyTo: messageDoc.replyTo as any }),
    };

    // 4. Publish to RabbitMQ
    await rabbitMQProducer.publishMessageEvent(messageEvent);

    res.status(201).json({
      status: "success",
      data: messageEvent,
    });
  } catch (error) {
    console.error("[MessageController] POST uploadImages error:", error);
    next(error);
  }
}

/**
 * Thu hồi 1 ảnh trong album
 */
export async function revokeImageInGroup(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { messageId, index } = req.params;
    const userId = getUserIdFromHeader(req);

    if (!messageId || index === undefined) {
      res.status(400).json({ error: "Missing messageId or index" });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const message = await messageDataService.getMessageById(
      messageId as string,
    );
    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    if (String(message.senderId) !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const updated = await messageDataService.revokeImageInGroup(
      messageId as string,
      parseInt(index as string),
    );

    if (updated) {
      await rabbitMQProducer.publishMessageUpdateEvent({
        _id: updated._id.toString(),
        conversationId: updated.conversationId.toString(),
        senderId: updated.senderId,
        senderName: updated.senderName || "",
        type: updated.type,
        content: updated.content,
        isRead: updated.isRead,
        createdAt: updated.createdAt,
        ...(updated.metadata && { metadata: updated.metadata }),
      });
    }

    res.json({ status: "success", data: updated });
  } catch (error) {
    console.error("[MessageController] PATCH revokeImageInGroup error:", error);
    next(error);
  }
}

/**
 * Xóa 1 ảnh trong album chỉ ở phía tôi
 */
export async function deleteImageInGroupForMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { messageId, index } = req.params;
    const userId = getUserIdFromHeader(req);

    if (!messageId || index === undefined) {
      res.status(400).json({ error: "Missing messageId or index" });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const updated = await messageDataService.deleteImageInGroupForMe(
      messageId as string,
      parseInt(index as string),
      userId,
    );

    if (updated) {
      await rabbitMQProducer.publishMessageUpdateEvent({
        _id: updated._id.toString(),
        conversationId: updated.conversationId.toString(),
        senderId: updated.senderId,
        senderName: updated.senderName || "",
        type: updated.type,
        content: updated.content,
        isRead: updated.isRead,
        createdAt: updated.createdAt,
        ...(updated.metadata && { metadata: updated.metadata }),
      });
    }

    res.json({ status: "success", data: updated });
  } catch (error) {
    console.error(
      "[MessageController] DELETE deleteImageInGroupForMe error:",
      error,
    );
    next(error);
  }
}

/**
 * Lấy tất cả tin nhắn đã ghim trong hội thoại
 */
export async function getPinnedMessages(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { conversationId } = req.params;

    if (typeof conversationId !== "string") {
      res.status(400).json({ error: "Invalid or missing conversationId" });
      return;
    }

    const pinnedMessages =
      await messageDataService.getPinnedMessages(conversationId);

    res.json({
      status: "success",
      data: pinnedMessages,
    });
  } catch (error) {
    console.error("[MessageController] GET pinned messages error:", error);
    next(error);
  }
}

/**
 * Tìm kiếm tin nhắn trong cuộc hội thoại
 */
export async function searchMessages(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { conversationId } = req.params;
    const { query } = req.query;
    const userId = getUserIdFromHeader(req);

    if (!conversationId || typeof conversationId !== "string") {
      res.status(400).json({ error: "Missing or invalid conversationId" });
      return;
    }

    if (!query || typeof query !== "string") {
      res.status(400).json({ error: "Missing or invalid search query" });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const messages = await messageDataService.searchMessages(
      conversationId,
      query,
      userId,
    );

    res.json({
      status: "success",
      data: messages,
    });
  } catch (error) {
    console.error("[MessageController] searchMessages error:", error);
    next(error);
  }
}

export async function globalSearchMessages(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { query, filterType } = req.query;
    const conversationIds = req.body.conversationIds; // Array of ids passed in POST body
    const userId = getUserIdFromHeader(req);

    if (!conversationIds || !Array.isArray(conversationIds) || conversationIds.length === 0) {
      res.status(400).json({ error: "Missing or invalid conversationIds array" });
      return;
    }

    if (!query || typeof query !== "string") {
      res.status(400).json({ error: "Missing or invalid search query" });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const messages = await messageDataService.globalSearchMessages(
      conversationIds,
      query,
      userId,
      filterType === 'file' ? 'file' : 'all'
    );

    res.status(200).json({ data: messages });
  } catch (error) {
    console.error("[MessageController] globalSearchMessages error:", error);
    next(error);
  }
}

/**
 * Bulk fetch messages by IDs — for Admin evidence log in report-service.
 * POST /api/v1/messages/bulk
 * Body: { ids: string[] }
 * Returns messages sorted by createdAt ASC.
 *
 * No user-ownership check: this is an internal Admin endpoint.
 * The Gateway should restrict this to admin roles only.
 */
export async function getBulkMessages(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        status: "error",
        message: "Body must contain a non-empty 'ids' array",
      });
      return;
    }

    if (ids.length > 40) {
      res.status(400).json({
        status: "error",
        message: "Cannot fetch more than 40 messages at once",
      });
      return;
    }

    const validIds = ids.filter((id: string) => Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      res.json({
        status: "success",
        data: [],
      });
      return;
    }

    const messages = await Message.find({ _id: { $in: validIds } })
      .sort({ createdAt: 1 }) // ASC — chronological order
      .select("_id conversationId senderId senderName type content createdAt isRevoked")
      .lean();

    // --- INVISIBLE MESSAGE COUNT ALGORITHM ---
    const result = await Promise.all(messages.map(async (m, index) => {
      let hiddenAfterCount = 0;
      
      // If there is a next message in the evidence list, check for gaps in the DB
      if (index < messages.length - 1) {
        const nextMsg = messages[index + 1];
        // Only check gap if they belong to the same conversation
        if (nextMsg && m.conversationId.toString() === nextMsg.conversationId.toString()) {
          hiddenAfterCount = await Message.countDocuments({
            conversationId: m.conversationId,
            createdAt: { $gt: m.createdAt, $lt: nextMsg.createdAt }
          });
        }
      }

      return {
        id: m._id.toString(),
        conversationId: m.conversationId.toString(),
        senderId: m.senderId,
        senderName: m.senderName ?? "Unknown",
        type: m.type,
        content: m.isRevoked ? "[Tin nhắn đã bị thu hồi]" : m.content,
        createdAt: m.createdAt,
        isRevoked: m.isRevoked,
        hiddenAfterCount, // The "Anti-Cherry-Picking" payload
      };
    }));

    res.json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("[MessageController] getBulkMessages error:", error);
    next(error);
  }
}

/**
 * Thu hồi nhiều tin nhắn cùng lúc (Bulk Revoke)
 */
export async function bulkRevokeMessages(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { messageIds } = req.body;
    const userId = getUserIdFromHeader(req);

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      res.status(400).json({ error: "messageIds must be a non-empty array" });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // messageDataService.bulkRevokeMessages sẽ lọc các tin nhắn hợp lệ (của user & < 24h)
    const revokedMessages = await messageDataService.bulkRevokeMessages(
      messageIds,
      userId,
    );

    // Phát sự kiện realtime cho từng tin nhắn đã thu hồi thành công
    const publishPromises = revokedMessages.map((msg) =>
      rabbitMQProducer.publishMessageRevokedEvent({
        messageId: msg._id.toString(),
        conversationId: msg.conversationId.toString(),
      }),
    );
    await Promise.all(publishPromises);

    res.json({
      status: "success",
      count: revokedMessages.length,
      revokedIds: revokedMessages.map((m) => m._id),
    });
  } catch (error) {
    console.error("[MessageController] Bulk REVOKE error:", error);
    next(error);
  }
}

/**
 * Xóa nhiều tin nhắn chỉ ở phía tôi (Bulk Delete For Me)
 */
export async function bulkDeleteMessagesForMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { messageIds } = req.body;
    const userId = getUserIdFromHeader(req);

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      res.status(400).json({ error: "messageIds must be a non-empty array" });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    await messageDataService.bulkDeleteMessagesForMe(messageIds, userId);

    res.json({
      status: "success",
      count: messageIds.length,
    });
  } catch (error) {
    console.error("[MessageController] Bulk DELETE for me error:", error);
    next(error);
  }
}

/**
 * Admin only: Fetch full conversation history for context auditing.
 * GET /api/v1/messages/conversation/:conversationId/admin
 */
export async function getAdminConversationHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { conversationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 200, 500);
    const skip = Math.max(parseInt(req.query.skip as string) || 0, 0);

    if (typeof conversationId !== "string") {
      res.status(400).json({ error: "Invalid conversationId" });
      return;
    }

    // Admin fetch: ignore clearedAt, joinedAt, etc.
    const messages = await Message.find({
      conversationId: new Types.ObjectId(conversationId),
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const result = messages.map((m) => ({
      id: m._id.toString(),
      conversationId: m.conversationId.toString(),
      senderId: m.senderId,
      senderName: m.senderName ?? "Unknown",
      type: m.type,
      content: m.isRevoked ? "[Tin nhắn đã bị thu hồi]" : m.content,
      createdAt: m.createdAt,
      isRevoked: m.isRevoked,
    }));

    res.json({
      status: "success",
      data: result.reverse(), // Send in chronological order
      count: result.length,
    });
  } catch (error) {
    console.error(
      "[MessageController] getAdminConversationHistory error:",
      error,
    );
    next(error);
  }
}

/**
 * Lấy tin nhắn cuối cùng cho danh sách các cuộc hội thoại của một user cụ thể (loại bỏ tin đã xóa)
 * POST /api/v1/messages/last-messages
 */
export async function getLastMessagesForConversations(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { conversationIds } = req.body;
    const userId = getUserIdFromHeader(req);

    if (!Array.isArray(conversationIds)) {
      res.status(400).json({ error: "conversationIds must be an array" });
      return;
    }

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (conversationIds.length === 0) {
      res.json({ status: "success", data: {} });
      return;
    }

    // Convert IDs to ObjectIds
    const objectIds = conversationIds
      .filter((id: string) => Types.ObjectId.isValid(id))
      .map((id: string) => new Types.ObjectId(id));

    // MongoDB Aggregation to find the last message for each conversation
    // where deletedByUsers does not contain the current user ID
    const aggregationResult = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: objectIds },
          deletedByUsers: { $ne: userId }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: "$conversationId",
          lastMessage: { $first: "$$ROOT" }
        }
      }
    ]);

    // Format output as a Map of conversationId -> messageDetails
    const data: Record<string, any> = {};
    aggregationResult.forEach((item) => {
      const msg = item.lastMessage;
      data[item._id.toString()] = {
        _id: msg._id.toString(),
        conversationId: msg.conversationId.toString(),
        senderId: msg.senderId,
        senderName: msg.senderName,
        type: msg.type,
        content: msg.content,
        metadata: msg.metadata,
        isRevoked: msg.isRevoked,
        createdAt: msg.createdAt,
      };
    });

    res.json({
      status: "success",
      data,
    });
  } catch (error) {
    console.error("[MessageController] getLastMessagesForConversations error:", error);
    next(error);
  }
}

