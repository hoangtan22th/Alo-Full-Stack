// src/services/broadcastService.ts
import { axiosClient } from "@/lib/axiosClient";

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8888";
const BROADCAST_API_URL = `${GATEWAY_URL}/api/v1/admin/messages/broadcasts`;

export interface BroadcastPayload {
  title: string;
  content: string;
  botType: 'SYSTEM' | 'SECURITY' | 'EVENT';
}

export interface BroadcastCampaign {
  _id: string;
  title: string;
  content: string;
  senderId: string;
  targetCount: number;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

export const broadcastService = {
  createBroadcast: async (data: BroadcastPayload) => {
    try {
      const response = await axiosClient.post(
        BROADCAST_API_URL,
        data
      );
      return response.data;
    } catch (error) {
      console.error("Error sending broadcast:", error);
      throw error;
    }
  },

  getBroadcastHistory: async (): Promise<BroadcastCampaign[]> => {
    try {
      const response = await axiosClient.get(`${BROADCAST_API_URL}/history`);
      return response.data.data;
    } catch (error) {
      console.error("Error fetching broadcast history:", error);
      throw error;
    }
  },

  getRealtimeHealth: async (): Promise<boolean> => {
    try {
      const response = await axiosClient.get(`${GATEWAY_URL}/api/v1/realtime/health`);
      return response.data.status === "UP";
    } catch (error) {
      console.error("Realtime service is down:", error);
      return false;
    }
  }
};
