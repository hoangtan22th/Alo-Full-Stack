package edu.iuh.fit.contact_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RealtimePayload {
    private String event;   // VD: "NEW_FRIEND_REQUEST" hoặc "FRIEND_ACCEPTED"
    private String target;  // ID của user nhận thông báo
    private String room;    // ID của group chat (Để null nếu chat 1-1)
    private Object data;    // Cái cục dữ liệu chứa tên, avatar... để React in ra màn hình
}