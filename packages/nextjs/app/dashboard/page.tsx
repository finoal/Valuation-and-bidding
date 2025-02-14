"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';
import { notification } from "~~/utils/scaffold-eth";

// 注册 ChartJS 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

interface DashboardData {
  dailyTransactions: any[];
  accreditationStats: any[];
  userStats: any[];
  nftStats: any[];
}

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    dailyTransactions: generateMockDailyTransactions(),
    accreditationStats: [65, 25, 10], // 模拟鉴定统计数据
    userStats: [120, 85, 200], // 模拟用户统计数据
    nftStats: [45, 35, 20] // 模拟 NFT 分类统计
  });
  const [isLoading, setIsLoading] = useState(false); // 改为 false 以直接显示模拟数据

  // 注释掉原有的数据获取逻辑
  /*
  useEffect(() => {
    const fetchDashboardData = async () => {
      // ... 原有的数据获取逻辑 ...
    };

    fetchDashboardData();
  }, []);
  */

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-base-200 min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center">数据分析仪表盘</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 交易量趋势图 */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">交易量趋势</h2>
          <Line
            data={{
              labels: dashboardData.dailyTransactions.map(item => item.date),
              datasets: [{
                label: '每日交易量',
                data: dashboardData.dailyTransactions.map(item => item.count),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
                title: {
                  display: true,
                  text: '每日交易量统计'
                }
              }
            }}
          />
        </div>

        {/* 鉴定情况饼图 */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">鉴定情况分布</h2>
          <Pie
            data={{
              labels: ['已鉴定', '待鉴定', '鉴定失败'],
              datasets: [{
                data: dashboardData.accreditationStats,
                backgroundColor: [
                  'rgba(75, 192, 192, 0.6)',
                  'rgba(255, 206, 86, 0.6)',
                  'rgba(255, 99, 132, 0.6)',
                ]
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                }
              }
            }}
          />
        </div>

        {/* 用户活跃度柱状图 */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">用户活跃度</h2>
          <Bar
            data={{
              labels: ['参与拍卖', '参与鉴定', '新增用户'],
              datasets: [{
                label: '用户数量',
                data: dashboardData.userStats,
                backgroundColor: [
                  'rgba(54, 162, 235, 0.6)',
                  'rgba(153, 102, 255, 0.6)',
                  'rgba(255, 159, 64, 0.6)',
                ]
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                }
              }
            }}
          />
        </div>

        {/* NFT 分类统计 */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">NFT 分类统计</h2>
          <Pie
            data={{
              labels: ['艺术品', '收藏品', '其他'],
              datasets: [{
                data: dashboardData.nftStats,
                backgroundColor: [
                  'rgba(255, 99, 132, 0.6)',
                  'rgba(54, 162, 235, 0.6)',
                  'rgba(255, 206, 86, 0.6)',
                ]
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

// 生成模拟的每日交易数据
const generateMockDailyTransactions = () => {
  const days = 30; // 生成30天的数据
  const result = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    result.unshift({
      date: date.toLocaleDateString(),
      count: Math.floor(Math.random() * 50) + 10 // 生成10-60之间的随机数
    });
  }

  return result;
};

// 以下是更详细的模拟数据生成函数，如果需要更真实的数据可以使用
const generateMockData = () => {
  // 模拟拍卖数据
  const mockAuctions = Array.from({ length: 100 }, (_, index) => ({
    id: index + 1,
    seller: `0x${Math.random().toString(16).slice(2, 42)}`,
    tokenId: Math.floor(Math.random() * 1000),
    startPrice: Math.floor(Math.random() * 10000),
    highestBid: Math.floor(Math.random() * 20000),
    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    category: ['艺术品', '收藏品', '其他'][Math.floor(Math.random() * 3)],
    status: ['active', 'completed', 'cancelled'][Math.floor(Math.random() * 3)]
  }));

  // 模拟鉴定数据
  const mockAccreditings = Array.from({ length: 50 }, (_, index) => ({
    id: index + 1,
    owner: `0x${Math.random().toString(16).slice(2, 42)}`,
    tokenId: Math.floor(Math.random() * 1000),
    is_approved: Math.random() > 0.3,
    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
  }));

  return {
    auctions: mockAuctions,
    accreditings: mockAccreditings
  };
};

// 数据处理辅助函数
const processDailyTransactions = (auctions: any[]) => {
  const dailyStats = auctions.reduce((acc: any, auction: any) => {
    const date = new Date(auction.created_at).toLocaleDateString();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(dailyStats).map(([date, count]) => ({
    date,
    count
  }));
};

const processAccreditationStats = (accreditings: any[]) => {
  // 直接返回模拟数据
  return [65, 25, 10]; // 已鉴定、待鉴定、鉴定失败
};

const processUserStats = (auctions: any[], accreditings: any[]) => {
  // 直接返回模拟数据
  return [120, 85, 200]; // 参与拍卖、参与鉴定、新增用户
};

const processNFTStats = (auctions: any[]) => {
  // 直接返回模拟数据
  return [45, 35, 20]; // 艺术品、收藏品、其他
};

export default Dashboard;
