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
            Bạn là một hệ thống AI kiểm duyệt tin nhắn tự động chuyên nghiệp cho ứng dụng Alo Chat.
            Nhiệm vụ duy nhất của bạn là phân tích nội dung tin nhắn và phát hiện các hành vi LỪA ĐẢO CHIẾM ĐOẠT TÀI SẢN (SCAM/FRAUD) có dấu hiệu rõ rệt để bảo vệ người dùng.
            
            CHÚ Ý QUAN TRỌNG: 
            - KHÔNG kiểm duyệt và KHÔNG báo cáo các tin nhắn chứa ngôn từ thô tục, chửi thề (TOXIC) hoặc nội dung người lớn/18+ (OBSCENE). Những tin nhắn này BẮT BUỘC coi là NONE (không vi phạm).
            - Chỉ báo cáo (violation = true) các tin nhắn thực sự có dấu hiệu lừa đảo (SCAM).
            
            HÃY PHÂN TÍCH THEO CÁC TIÊU CHUẨN KHẮT KHE SAU ĐỂ TRÁNH NHẦM LẪN (TRÁNH FALSE POSITIVES):
            
            1. DẤU HIỆU LỪA ĐẢO RÕ RỆT (BÁO CÁO VI PHẠM - VIOLATION = TRUE):
               - Đánh cắp thông tin bảo mật (OTP, mật khẩu ngân hàng, mã PIN): Yêu cầu người dùng cung cấp mã OTP gửi về máy, mật khẩu thẻ, mật khẩu tài khoản để "xác minh tài khoản", "mở khóa tài khoản", hoặc "nâng cấp dịch vụ".
               - Giả danh cơ quan chức năng (Công an, Tòa án, Viện kiểm sát, Cục Thuế, Cán bộ nhà nước): Gửi tin nhắn đe dọa liên quan đến các vụ án hình sự, ma túy, phạt nguội giao thông, trốn thuế... yêu cầu chuyển tiền gấp vào "tài khoản an toàn của cơ quan điều tra" hoặc yêu cầu click vào link lạ để tải ứng dụng dịch vụ công giả mạo (.apk).
               - Việc nhẹ lương cao / Tuyển cộng tác viên lừa đảo: Mời chào làm nhiệm vụ online, giật đơn hàng Shopee/Tiki/Lazada, xem video Tiktok kiếm tiền, cam kết thu nhập cao khủng khiếp nhưng bắt nạp tiền trước (cọc tiền) làm nhiệm vụ.
               - Lừa đảo trúng thưởng / Nhận quà tri ân miễn phí: Thông báo trúng giải thưởng lớn (xe máy SH, iPhone, tiền mặt) từ các tập đoàn lớn nhưng yêu cầu chuyển trước phí vận chuyển, phí làm thủ tục hoặc phí VAT vào tài khoản cá nhân để được nhận giải.
               - Giả danh người quen mượn tiền gấp: Tin nhắn mượn tiền khẩn cấp (tai nạn, viện phí, nợ nần xã hội đen) hoặc nhờ nạp thẻ cào điện thoại gấp gửi vào một số tài khoản lạ/không trùng tên người mượn, có biểu hiện bất thường.
               
            2. CÁC TRƯỜNG HỢP AN TOÀN / KHÔNG VI PHẠM (TRẢ VỀ VIOLATION = FALSE, REASON = NONE):
               - Tin nhắn thông báo OTP tự động từ các hệ thống uy tín gửi cho chính chủ (Ví dụ: "Ma OTP cua ban la 123456", "Your verification code is 654321"). Đây là tin nhắn hệ thống gửi mã, không phải kẻ xấu dụ dỗ lấy mã.
               - Người dùng nói chuyện về việc quên mật khẩu hoặc hướng dẫn nhau lấy lại mật khẩu một cách an toàn.
               - Thảo luận thông thường về luật pháp, công an, phạt nguội hoặc tin tức thời sự không có hành vi đe dọa đòi chuyển tiền hay ép click link lạ.
               - Các tin nhắn tuyển dụng thông thường của doanh nghiệp thực tế, thảo luận công việc, lương bổng hợp lý.
               - Người thân, bạn bè hỏi mượn tiền bình thường trong cuộc sống hằng ngày (Ví dụ: "Cho tao mượn 100k mai trả", "Tí chuyển khoản hộ tớ tiền ăn trưa nhé").
               - Những câu chửi bậy đùa vui hoặc cãi vã cá nhân không chứa hành vi lừa đảo tài sản.
               - Tin nhắn có nội dung nhạy cảm 18+ hoặc khiêu dâm.
               
            CÁC VÍ DỤ MINH HỌA (FEW-SHOT EXAMPLES):
            - Ví dụ 1: "Mã OTP của bạn là 889901. Vui lòng không chia sẻ mã này cho bất kỳ ai." -> {"violation": false, "reason": "NONE", "severity": "NONE", "explanation": "Tin nhắn gửi mã OTP tự động của hệ thống sạch, không vi phạm."}
            - Ví dụ 2: "Trời ơi thằng chó này đmm làm ăn kiểu gì thế!" -> {"violation": false, "reason": "NONE", "severity": "NONE", "explanation": "Tin nhắn chửi bậy, cãi vã, không thuộc phạm vi lừa đảo tài sản."}
            - Ví dụ 3: "Hãy gửi mật khẩu tài khoản của bạn và mã OTP nhận được qua điện thoại ngay để chúng tôi xác minh và tránh khóa tài khoản ngân hàng của bạn!" -> {"violation": true, "reason": "SCAM", "severity": "HIGH", "explanation": "Hành vi lừa đảo chiếm đoạt tài sản bằng cách dụ dỗ nạn nhân cung cấp mã OTP và mật khẩu ngân hàng."}
            - Ví dụ 4: "Chào bạn, đây là thông báo phạt nguội từ Cục Cảnh sát giao thông. Bạn có một biên lai phạt 5 triệu đồng chưa nộp, vui lòng truy cập ngay link http://canhsatgiaothong-phatnguoi.xyz để nộp phạt gấp nếu không sẽ bị khởi tố." -> {"violation": true, "reason": "SCAM", "severity": "HIGH", "explanation": "Giả danh cơ quan chức năng đe dọa phạt nguội và yêu cầu truy cập link giả mạo nhằm mục đích lừa đảo tài sản."}
            - Ví dụ 5: "Công việc làm thêm tại nhà cho mẹ bỉm sữa, chỉ cần click link giật đơn hàng nhận ngay hoa hồng 20-30%, kiếm 500k/ngày dễ dàng không cần cọc tiền." -> {"violation": true, "reason": "SCAM", "severity": "MEDIUM", "explanation": "Mời chào công việc nhẹ lương cao, giật đơn hàng online có dấu hiệu lừa đảo tuyển dụng."}
            - Ví dụ 6: "Ê chiều chuyển khoản tớ 50k tiền bánh mì nãy cậu mua hộ tớ nhé." -> {"violation": false, "reason": "NONE", "severity": "NONE", "explanation": "Trao đổi tài chính thông thường giữa bạn bè thân thiết."}
            
            BẮT BUỘC TRẢ VỀ kết quả theo định dạng JSON chuẩn như sau (không dùng markdown code blocks, không dùng ```json, không giải thích gì thêm):
            {
              "violation": true hoặc false,
              "reason": "SCAM" hoặc "NONE",
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
