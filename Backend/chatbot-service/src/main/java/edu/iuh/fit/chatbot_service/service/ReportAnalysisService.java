package edu.iuh.fit.chatbot_service.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import edu.iuh.fit.chatbot_service.dto.AiAnalysisResponseDTO;
import edu.iuh.fit.chatbot_service.dto.ReportAnalysisRequestDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class ReportAnalysisService {

    private final ChatClient chatClient;
    private final ObjectMapper objectMapper;
    private final edu.iuh.fit.chatbot_service.config.ReportAiTools reportAiTools;

    private static final String REPORT_ANALYSIS_SYSTEM_PROMPT = """
            Bạn là một hệ thống AI Trợ lý Thẩm phán chuyên nghiệp chạy ngầm cho ứng dụng Alo Chat.
            Nhiệm vụ của bạn là phân tích báo cáo vi phạm (Report), kiểm duyệt nội dung các tin nhắn bằng chứng (MessageSnapshots), tra cứu lịch sử vi phạm thông qua công cụ và đưa ra ĐỀ XUẤT PHÁN QUYẾT gợi ý cho Admin duyệt.
            
            QUY TẮC CỐT LÕI (BẮT BUỘC TUÂN THỦ):
            1. CHỈ PHẠT VÀ ĐỀ XUẤT BAN/DISBAND_GROUP ĐỐI VỚI HÀNH VI LỪA ĐẢO TÀI SẢN (SCAM/FRAUD) có dấu hiệu rõ rệt.
            2. Các hành vi khác như Chửi bậy cãi vã (TOXIC), Cá độ cờ bạc (GAMBLING), trao đổi tài chính thân mật/bình thường giữa bạn bè, hoặc tin nhắn mã OTP hệ thống thông báo... BẮT BUỘC đề xuất hành động là "DISMISS" (Bác bỏ báo cáo) và không vi phạm.
            
            CÁC DẤU HIỆU LỪA ĐẢO CẦN PHÁT HIỆN:
            - Đụ dỗ lấy OTP, mật khẩu, thông tin thẻ tín dụng cá nhân để hack tài khoản.
            - Giả danh Công an, Tòa án đe dọa án phạt hình sự, phạt nguội để bắt chuyển tiền khẩn cấp hoặc dụ click link tải app lừa đảo (.apk).
            - Việc làm online, việc nhẹ lương cao kiếm tiền online nạp cọc giật đơn hàng Shopee/Tiki/Lazada.
            - Trúng giải thưởng lớn giả mạo (xe máy SH, iPhone, tiền mặt) bắt đóng trước phí VAT/phí vận chuyển.
            - Giả danh người quen nhờ chuyển khoản khẩn cấp vào số tài khoản lạ, có biểu hiện bất thường.
            
            SỬ DỤNG CÔNG CỤ TRA CỨU TIỀN ÁN (FUNCTION CALLING):
            - Bạn bắt buộc phải gọi công cụ `countTargetViolations` truyền vào `targetId` để lấy số lần vi phạm trong quá khứ của đối tượng bị báo cáo.
            - Nếu đối tượng đã có tiền án vi phạm cũ trước đó >= 1 lần, bạn BẮT BUỘC đề xuất mức phạt cao nhất là "BAN" (nếu là User) hoặc "DISBAND_GROUP" (nếu là Group lừa đảo).
            
            CÁC HÀNH ĐỘNG ĐỀ XUẤT (suggestedAction):
            - "BAN": Khóa tài khoản vĩnh viễn (đối với User lừa đảo rõ ràng hoặc tái phạm).
            - "DISBAND_GROUP": Giải tán nhóm (nếu đối tượng bị báo cáo là Group và Group đó tạo ra chỉ để lừa đảo tuyển dụng ảo, cờ bạc).
            - "DISMISS": Bác bỏ báo cáo (đối với tin nhắn bình thường, chửi bậy, cờ bạc, cãi vã, hoặc không đủ bằng chứng lừa đảo).
            
            BẮT BUỘC TRẢ VỀ kết quả theo định dạng JSON chuẩn như sau (không dùng markdown code blocks, không dùng ```json, không giải thích gì thêm):
            {
              "summary": "Tóm tắt ngắn gọn bằng tiếng Việt lý do tại sao đưa ra phán quyết này (nêu rõ hành vi lừa đảo hoặc lý do bác bỏ)",
              "suggestedAction": "BAN" hoặc "DISBAND_GROUP" hoặc "DISMISS",
              "confidence": mức độ tin cậy từ 0.0 đến 1.0
            }
            """;

    public ReportAnalysisService(ChatClient.Builder chatClientBuilder, ObjectMapper objectMapper, edu.iuh.fit.chatbot_service.config.ReportAiTools reportAiTools) {
        this.chatClient = chatClientBuilder.build();
        this.objectMapper = objectMapper;
        this.reportAiTools = reportAiTools;
    }

    public AiAnalysisResponseDTO analyzeReport(ReportAnalysisRequestDTO request) {
        log.info("[AI Report Analysis] Starting analysis for Report ID: {}, Target ID: {}", 
                request.reportId(), request.targetId());

        try {
            // Build the user context description
            StringBuilder userPrompt = new StringBuilder();
            userPrompt.append("Thông tin báo cáo:\n")
                      .append("- Lý do tố cáo (Reason): ").append(request.reason()).append("\n")
                      .append("- Đối tượng bị tố cáo (Target ID): ").append(request.targetId()).append("\n")
                      .append("- Loại đối tượng: ").append(request.targetType()).append("\n")
                      .append("- Tên đối tượng: ").append(request.targetName()).append("\n")
                      .append("- Loại cuộc trò chuyện: ").append(request.conversationType()).append("\n\n");

            userPrompt.append("Danh sách tin nhắn bằng chứng (MessageSnapshots):\n");
            if (request.messageSnapshots() != null && !request.messageSnapshots().isEmpty()) {
                for (var snapshot : request.messageSnapshots()) {
                    userPrompt.append(String.format("[%s] Người gửi %s (ID %s): \"%s\" (Anchor: %b)\n",
                            snapshot.sentAt() != null ? snapshot.sentAt().toString() : "N/A",
                            snapshot.senderName(),
                            snapshot.senderId(),
                            snapshot.content(),
                            snapshot.isAnchor()
                    ));
                }
            } else {
                userPrompt.append("(Không có tin nhắn bằng chứng nào được đính kèm)\n");
            }

            log.info("[AI Report Analysis] Invoking ChatModel with countTargetViolations function calling...");

            // Call ChatModel with Function Tool calling
            String llmResponse = chatClient.prompt()
                    .system(REPORT_ANALYSIS_SYSTEM_PROMPT)
                    .user(userPrompt.toString())
                    .toolCallbacks(reportAiTools) // Register the programmatic ToolCallback bean
                    .call()
                    .content();

            String cleanedJson = cleanJsonResponse(llmResponse);
            log.info("[AI Report Analysis] Raw response: {}", cleanedJson);

            // Parse response
            AiAnalysisResponseDTO result = objectMapper.readValue(cleanedJson, AiAnalysisResponseDTO.class);
            if (result != null) {
                return result;
            }
        } catch (Exception e) {
            log.error("[AI Report Analysis] Critical error during report AI analysis", e);
        }

        // Fallback in case of any failures
        return new AiAnalysisResponseDTO(
                "[Hệ thống] Trục trặc kỹ thuật kết nối AI engine. Không thể phân tích nội dung.",
                "DISMISS",
                0.0
        );
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
}
