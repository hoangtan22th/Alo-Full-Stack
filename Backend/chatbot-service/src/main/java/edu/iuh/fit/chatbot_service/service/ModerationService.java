package edu.iuh.fit.chatbot_service.service;

import edu.iuh.fit.chatbot_service.client.ReportClient;
import edu.iuh.fit.chatbot_service.dto.*;
import edu.iuh.fit.common_service.dto.response.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class ModerationService {

    private final ChatClient chatClient;
    private final ReportClient reportClient;
    private final ObjectMapper objectMapper;

    private static final String MODERATION_SYSTEM_PROMPT = """
            Bạn là một hệ thống AI kiểm duyệt nội dung tin nhắn tự động chuyên nghiệp cho ứng dụng Alo Chat.
            Nhiệm vụ của bạn là phân tích nội dung tin nhắn tiếng Việt/tiếng Anh và xác định xem nó có thực sự vi phạm tiêu chuẩn cộng đồng hay không.

            HÃY PHÂN TÍCH THEO CÁC TIÊU CHUẨN KHẮT KHE SAU:
            1. SPAM: Tin nhắn quảng cáo rác lặp đi lặp lại nhiều lần vô nghĩa, quảng bá dịch vụ cờ bạc, cá độ trái phép gây phiền nhiễu.
            2. TOXIC (Công kích/Xúc phạm): Ngôn từ cực kỳ tục tĩu thô thiển, chửi thề vô văn hóa xúc phạm trực tiếp nặng nề danh dự người khác, hoặc kích động bạo lực đe dọa tính mạng. (CHÚ Ý: Từ ngữ chửi bậy đùa vui bình thường giữa bạn bè thân thiết, từ cảm thán không nhằm mục đích xúc phạm nặng nề thì KHÔNG coi là TOXIC).
            3. SCAM (Lừa đảo/Gian lận): Tin nhắn có dấu hiệu lừa đảo chiếm đoạt tài sản rõ rệt (ví dụ: yêu cầu cung cấp OTP, mật khẩu tài khoản, số thẻ tín dụng bảo mật, giả danh công an/cơ quan chức năng đòi chuyển tiền gấp).
            4. OBSCENE (Đồi trụy): Truyền bá văn hóa phẩm đồi trụy khiêu dâm, gạ gẫm tình dục thô tục cực đoan.

            QUY TẮC QUAN TRỌNG:
            - Hệ thống kiểm duyệt phải KHÔNG ĐƯỢC QUÁ NHẠY CẢM. Các tin nhắn thông thường, trò chuyện thân thiện, hỏi han đời sống hàng ngày, đùa vui bình thường hoặc câu nói bộc lộ cảm xúc thông thường BẮT BUỘC phải coi là NONE (không vi phạm).
            - Chỉ đánh giá là vi phạm nếu tin nhắn chứa các từ ngữ/nội dung rõ ràng vi phạm một trong bốn tiêu chí trên.

            CÁC VÍ DỤ MINH HỌA (FEW-SHOT EXAMPLES):
            - Ví dụ 1: "Hôm nay đi ăn tối nhé!" -> {"violation": false, "reason": "NONE", "severity": "NONE", "explanation": "Tin nhắn trao đổi thông thường sạch."}
            - Ví dụ 2: "Trời ơi bực mình vcl!" -> {"violation": false, "reason": "NONE", "severity": "NONE", "explanation": "Tin nhắn cảm thán thông thường, không vi phạm."}
            - Ví dụ 3: "Bạn là đồ ngu ngốc!" -> {"violation": true, "reason": "TOXIC", "severity": "LOW", "explanation": "Xúc phạm nhẹ người khác bằng từ ngữ thiếu lịch sự."}
            - Ví dụ 4: "Mày cút đi đồ con chó đmm tao sẽ giết mày!" -> {"violation": true, "reason": "TOXIC", "severity": "HIGH", "explanation": "Chửi bới thô tục cực đoan kèm đe dọa bạo lực."}
            - Ví dụ 5: "Hãy gửi mật khẩu tài khoản của bạn và mã OTP nhận được qua tin nhắn ngay để chúng tôi mở khóa thẻ ngân hàng cho bạn!" -> {"violation": true, "reason": "SCAM", "severity": "HIGH", "explanation": "Hành vi lừa đảo chiếm đoạt tài sản bằng cách yêu cầu mã OTP và mật khẩu ngân hàng."}

            BẮT BUỘC TRẢ VỀ kết quả theo định dạng JSON chuẩn như sau (không dùng markdown code blocks, không dùng ```json, không giải thích gì thêm):
            {
              "violation": true hoặc false,
              "reason": "SPAM" hoặc "TOXIC" hoặc "SCAM" hoặc "OBSCENE" hoặc "NONE",
              "severity": "HIGH" hoặc "MEDIUM" hoặc "LOW" hoặc "NONE",
              "explanation": "Giải thích ngắn gọn lý do vi phạm bằng tiếng Việt"
            }
            """;

    public ModerationService(ChatClient.Builder chatClientBuilder, ReportClient reportClient, ObjectMapper objectMapper) {
        this.chatClient = chatClientBuilder.build();
        this.reportClient = reportClient;
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> moderateMessage(ModerationRequest request) {
        log.info("[AI Moderation] Starting moderation for message {} from sender {}", request.messageId(), request.senderId());
        
        try {
            // 1. Gọi LLM để kiểm duyệt tin nhắn
            String llmResponse = chatClient.prompt()
                    .system(MODERATION_SYSTEM_PROMPT)
                    .user("Nội dung tin nhắn cần kiểm duyệt: \"" + request.content() + "\"")
                    .call()
                    .content();

            String cleanedJson = cleanJsonResponse(llmResponse);
            log.info("[AI Moderation] Raw LLM Response: {}", cleanedJson);

            // 2. Parse kết quả từ JSON
            ModerationResult result = objectMapper.readValue(cleanedJson, ModerationResult.class);

            if (result != null && result.violation()) {
                log.warn("[AI Moderation] Violation detected! Reason: {}, Severity: {}, Explanation: {}", 
                        result.reason(), result.severity(), result.explanation());

                // 3. Chuẩn bị snapshot làm bằng chứng
                LocalDateTime sentTime;
                try {
                    sentTime = LocalDateTime.parse(request.timestamp(), DateTimeFormatter.ISO_DATE_TIME);
                } catch (Exception e) {
                    sentTime = LocalDateTime.now();
                }

                MessageSnapshotDTO snapshot = new MessageSnapshotDTO(
                        request.messageId(),
                        request.senderId(),
                        request.senderName(),
                        null, // Avatar
                        request.content(),
                        request.type(),
                        sentTime,
                        true, // isAnchor
                        1,
                        1,
                        false // isByReporter
                );

                // Ánh xạ lý do sang ReportReason của report-service
                String mappedReason = mapToReportReason(result.reason());

                // 4. Tạo báo cáo vi phạm qua ReportClient
                ReportCreationRequestDTO reportRequest = new ReportCreationRequestDTO(
                        "SYSTEM", // reporterId
                        request.senderId(), // targetId (người vi phạm)
                        "USER", // targetType
                        request.senderName(), // targetName
                        request.isGroup() ? "GROUP" : "ONE_TO_ONE", // conversationType
                        request.conversationId(), // conversationId
                        mappedReason,
                        "[HỆ THỐNG AI TỰ ĐỘNG PHÁT HIỆN] " + result.explanation(),
                        Collections.emptyList(),
                        List.of(snapshot)
                );

                log.info("[AI Moderation] Sending automated report to report-service...");
                ApiResponse<ReportResponseDTO> reportResponse = reportClient.createReport(reportRequest);
                
                if (reportResponse != null && reportResponse.getData() != null) {
                    String reportId = reportResponse.getData().id();
                    log.info("[AI Moderation] Report created successfully with ID: {}", reportId);

                    // 5. Nếu vi phạm đặc biệt nghiêm trọng (HIGH) -> Tự động KHÓA TÀI KHOẢN ngay lập tức
                    if ("HIGH".equalsIgnoreCase(result.severity())) {
                        log.warn("[AI Moderation] Severity is HIGH! Initiating AUTOMATIC ACCOUNT BAN for user {}", request.senderId());
                        
                        String banNotes = String.format(
                                "[HỆ THỐNG AI TỰ ĐỘNG KHÓA] Tài khoản của bạn đã bị khóa vĩnh viễn do vi phạm nghiêm trọng quy chuẩn cộng đồng: %s. Tin nhắn vi phạm: \"%s\"",
                                result.explanation(),
                                request.content()
                        );

                        AdminActionRequestDTO banRequest = new AdminActionRequestDTO(
                                "BAN",
                                banNotes,
                                "SYSTEM",
                                request.senderName()
                        );

                        ApiResponse<ReportAdminResponseDTO> resolveResponse = reportClient.resolveReport(
                                reportId,
                                "SYSTEM",
                                banRequest
                        );

                        if (resolveResponse != null && resolveResponse.getData() != null) {
                            log.info("[AI Moderation] User {} has been successfully banned by SYSTEM.", request.senderId());
                        }
                    }
                }
            } else {
                log.info("[AI Moderation] Message {} is clean.", request.messageId());
            }

            return Map.of(
                    "violation", result != null && result.violation(),
                    "reason", result != null ? result.reason() : "NONE",
                    "severity", result != null ? result.severity() : "NONE",
                    "explanation", result != null ? result.explanation() : "Tin nhắn không vi phạm"
            );

        } catch (Exception e) {
            log.error("[AI Moderation] Error during moderation processing", e);
            return Map.of(
                    "error", true,
                    "message", e.getMessage()
            );
        }
    }

    private String cleanJsonResponse(String response) {
        if (response == null) return "{}";
        response = response.trim();
        if (response.startsWith("```")) {
            response = response.replaceAll("^```json\\s*", "");
            response = response.replaceAll("^```\\s*", "");
            response = response.replaceAll("\\s*```$", "");
        }
        return response.trim();
    }

    private String mapToReportReason(String aiReason) {
        if (aiReason == null) return "OTHER";
        return switch (aiReason.toUpperCase()) {
            case "SPAM", "TOXIC" -> "SPAM_HARASSMENT";
            case "SCAM" -> "SCAM_FRAUD";
            case "OBSCENE" -> "SEXUAL_CONTENT";
            default -> "OTHER";
        };
    }

    private record ModerationResult(
            boolean violation,
            String reason,
            String severity,
            String explanation
    ) {}
}
