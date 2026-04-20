import axios from 'axios';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8888';

/**
 * Verify user membership in conversation
 * Calls group-service to check user is a member
 * Now sends token for better security
 */
export async function verifyUserInConversation(
  conversationId: string,
  userId: string,
  token?: string
): Promise<boolean> {
  try {
    console.log(`[ExternalServices] Verifying User: ${userId} in Conversation: ${conversationId}`);

    const headers: any = {
      'x-user-id': userId,
    };

    // Thêm token nếu có
    if (token) {
      headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    const response = await axios.get(
      `${GATEWAY_URL}/api/v1/groups/${conversationId}`,
      {
        headers,
        timeout: 5000,
      }
    );

    const groupData = response.data.data || response.data;

    // Check if conversation exists and IDs match
    const groupId = groupData._id?.toString() || groupData.id?.toString();
    if (!groupData || groupId !== conversationId) {
      console.warn(`[ExternalServices] Conversation ${conversationId} not found or mismatch`);
      return false;
    }

    // Check if user is in members list
    const members = groupData.members || [];
    const isMember = members.some((m: any) => m.userId?.toString() === userId.toString());

    if (!isMember) {
      console.warn(`[ExternalServices] User ${userId} is NOT a member of ${conversationId}`);
      return false;
    }

    console.log(`[ExternalServices] ✅ Verification successful for User ${userId}`);
    return true;
  } catch (error: any) {
    const statusCode = error.response?.status;
    const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;

    console.error(
      `[ExternalServices] ❌ Failed to verify: ${statusCode}`,
      `- ${errorMsg}`
    );
    
    // Different handling based on error type
    if (statusCode === 404) {
      console.warn(`[ExternalServices] ℹ️ Conversation ${conversationId} not found in group-service`);
      console.warn('[ExternalServices] Make sure the conversation exists in group-service first!');
      return false;
    }

    if (statusCode === 401 || statusCode === 403) {
      console.error('[ExternalServices] 🔐 Authorization error - token may be invalid or expired');
      return false;
    }

    if (statusCode === 500) {
      console.error('[ExternalServices] 💥 Group-service server error - check logs on group-service');
      return false;
    }

    if (error.code === 'ECONNREFUSED') {
      console.error('[ExternalServices] ❌ Cannot connect to Gateway (GATEWAY_URL)');
      console.error(`   Make sure Gateway is running at: ${GATEWAY_URL}`);
      return false;
    }

    console.error('[ExternalServices] Unknown error:', errorMsg);
    return false;
  }
}

/**
 * Backward compatibility wrapper
 */
export async function validateUserInConversation(
  conversationId: string,
  userId: string,
  token?: string
): Promise<boolean> {
  return verifyUserInConversation(conversationId, userId, token);
  return verifyUserInConversation(conversationId, userId, token);
}

export default {
  verifyUserInConversation,
  validateUserInConversation,
};