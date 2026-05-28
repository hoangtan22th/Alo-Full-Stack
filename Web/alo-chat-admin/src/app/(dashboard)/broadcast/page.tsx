// src/app/(dashboard)/broadcast/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { PlusIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import { broadcastService, BroadcastCampaign } from "@/services/broadcastService";
import { Button } from "@/components/ui/button";

// Sub-components
import { BroadcastStats } from "@/components/broadcast/BroadcastStats";
import { BroadcastFilters } from "@/components/broadcast/BroadcastFilters";
import { BroadcastTable } from "@/components/broadcast/BroadcastTable";
import { CreateBroadcastModal } from "@/components/broadcast/CreateBroadcastModal";
import { BroadcastDetailModal } from "@/components/broadcast/BroadcastDetailModal";

export default function BroadcastPage() {
  const [history, setHistory] = useState<BroadcastCampaign[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isRealtimeOnline, setIsRealtimeOnline] = useState(true);

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeBot, setActiveBot] = useState("ALL");
  const [activeStatus, setActiveStatus] = useState("ALL");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<BroadcastCampaign | null>(null);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const checkHealth = async () => {
    const isUp = await broadcastService.getRealtimeHealth();
    setIsRealtimeOnline(isUp);
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await broadcastService.getBroadcastHistory();
      setHistory(data);
      checkHealth();
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    checkHealth();
    const interval = setInterval(() => {
      fetchHistory();
      checkHealth();
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  // Summary Stats
  const stats = useMemo(() => {
    const totalCampaigns = history.length;
    const totalReach = history.reduce((sum, c) => sum + (c.targetCount || 0), 0);
    return { totalCampaigns, totalReach };
  }, [history]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return history.filter(c => {
      const matchesSearch = !debouncedSearch ||
        c.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        c.content.toLowerCase().includes(debouncedSearch.toLowerCase());

      const botMap: Record<string, string> = {
        'SYSTEM': '00000000-0000-0000-0000-000000000000',
        'SECURITY': '11111111-1111-1111-1111-111111111111',
        'EVENT': '22222222-2222-2222-2222-222222222222'
      };

      const matchesBot = activeBot === "ALL" || c.senderId === botMap[activeBot];
      const matchesStatus = activeStatus === "ALL" || c.status === activeStatus;

      return matchesSearch && matchesBot && matchesStatus;
    });
  }, [history, debouncedSearch, activeBot, activeStatus]);

  const handleReset = () => {
    setSearchTerm("");
    setActiveBot("ALL");
    setActiveStatus("ALL");
    fetchHistory();
  };

  return (
    <div className="animate-in fade-in duration-500 pb-10">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-on-surface tracking-tight font-headline">
            Global Broadcast
          </h2>
          <p className="text-on-surface-variant mt-1 font-medium text-sm">
            Manage campaigns and track reach
          </p>
        </div>
        <div className="flex gap-3">
          {/* <Button 
            variant="outline"
            className="border-none bg-surface-container-highest text-on-surface font-semibold hover:bg-surface-container-high transition-colors"
          >
            <ChartBarIcon className="w-5 h-5 mr-2" />
            Báo cáo chi tiết
          </Button> */}
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-primary text-on-primary font-semibold hover:bg-primary-dim transition-colors shadow-[inset_0_2px_0_rgba(255,255,255,0.1)]"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Tạo bản tin mới
          </Button>
        </div>
      </div>

      {/* 1. Stat Cards */}
      <BroadcastStats
        totalCampaigns={stats.totalCampaigns}
        totalReach={stats.totalReach}
        isRealtimeOnline={isRealtimeOnline}
      />

      {/* 2. Filter Bar */}
      <BroadcastFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeBot={activeBot}
        onBotChange={setActiveBot}
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
        onRefresh={handleReset}
        isLoading={isLoadingHistory}
        totalCount={filteredHistory.length}
      />

      {/* 3. History Table */}
      <BroadcastTable
        campaigns={filteredHistory}
        isLoading={isLoadingHistory}
        onViewDetail={setSelectedCampaign}
        onResetFilters={handleReset}
      />

      {/* 4. Modals */}
      <CreateBroadcastModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchHistory}
      />

      <BroadcastDetailModal
        campaign={selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
      />

    </div>
  );
}
