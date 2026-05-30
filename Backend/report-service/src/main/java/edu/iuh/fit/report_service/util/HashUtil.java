package edu.iuh.fit.report_service.util;

import edu.iuh.fit.report_service.entity.MessageSnapshot;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

public class HashUtil {

    public static String calculateSnapshotHash(String reason, List<MessageSnapshot> snapshots) {
        if (snapshots == null || snapshots.isEmpty()) {
            return generateSHA256(reason + ":no-snapshots");
        }

        StringBuilder sb = new StringBuilder();
        sb.append(reason).append(":");
        for (MessageSnapshot snapshot : snapshots) {
            sb.append(snapshot.getMessageId())
              .append("|")
              .append(snapshot.getContent())
              .append(";");
        }
        return generateSHA256(sb.toString());
    }

    private static String generateSHA256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception ex) {
            throw new RuntimeException("Error calculating SHA-256 hash", ex);
        }
    }
}
