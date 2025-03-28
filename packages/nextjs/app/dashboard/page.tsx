"use client";

import { useEffect, useState } from "react";
import axios from "axios";
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

// 交易记录类型定义
interface Transaction {
  id: number;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
  from_address: string;
  to_address: string;
  gas: string;
  status: string;
  operation_description: string;
  created_at: string;
}

interface DashboardData {
  dailyTransactions: { date: string; count: number }[];
  operationTypeStats: { type: string; count: number }[];
  addressStats: { address: string; count: number }[];
  statusStats: { status: string; count: number }[];
}

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    dailyTransactions: [],
    operationTypeStats: [],
    addressStats: [],
    statusStats: []
  });
  const [isLoading, setIsLoading] = useState(true);

  // 获取区块链交易数据并处理
  useEffect(() => {
    const fetchBlockchainData = async () => {
      try {
        setIsLoading(true);
        
        // 获取所有交易记录
        const response = await axios.get<Transaction[]>("http://localhost:3001/getTransactions");
        const transactions = response.data;
        
        if (transactions && transactions.length > 0) {
          // 处理每日交易量统计
          const dailyTransactions = processDailyTransactions(transactions);
          
          // 处理操作类型统计
          const operationTypeStats = processOperationTypes(transactions);
          
          // 处理地址活跃度统计
          const addressStats = processAddressActivity(transactions);
          
          // 处理交易状态统计
          const statusStats = processTransactionStatus(transactions);
          
          setDashboardData({
            dailyTransactions,
            operationTypeStats,
            addressStats,
            statusStats
          });
          
          notification.success("数据加载成功");
        } else {
          notification.error("没有找到交易数据");
        }
      } catch (error) {
        console.error("获取区块链数据失败:", error);
        notification.error("获取区块链数据失败");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlockchainData();
  }, []);

  // 处理每日交易量统计
  const processDailyTransactions = (transactions: Transaction[]) => {
    // 按日期分组交易
    const dailyStats = transactions.reduce((acc: Record<string, number>, tx: Transaction) => {
      // 格式化日期为 YYYY-MM-DD
      const date = new Date(tx.block_timestamp).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // 获取最近30天的日期
    const today = new Date();
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    // 生成每日交易量数据
    const result = last30Days.map(date => ({
      date,
      count: dailyStats[date] || 0
    }));

    return result;
  };

  // 处理操作类型统计
  const processOperationTypes = (transactions: Transaction[]) => {
    // 提取操作类型（根据operation_description中的关键词）
    const typeMap: Record<string, number> = {};
    
    transactions.forEach(tx => {
      let type = "其他";
      
      if (tx.operation_description.includes("鉴定")) {
        type = "鉴定操作";
      } else if (tx.operation_description.includes("授权")) {
        type = "授权操作";
      } else if (tx.operation_description.includes("参与竞价") || tx.operation_description.includes("拍卖")) {
        type = "拍卖/竞价";
      } else if (tx.operation_description.includes("创建")) {
        type = "创建操作";
      } else if (tx.operation_description.includes("更新")) {
        type = "更新操作";
      }
      
      typeMap[type] = (typeMap[type] || 0) + 1;
    });
    
    // 转换为数组格式
    return Object.entries(typeMap).map(([type, count]) => ({ type, count }));
  };

  // 处理地址活跃度统计
  const processAddressActivity = (transactions: Transaction[]) => {
    // 统计地址出现的次数
    const addressCount: Record<string, number> = {};
    
    transactions.forEach(tx => {
      addressCount[tx.from_address] = (addressCount[tx.from_address] || 0) + 1;
    });
    
    // 排序并获取最活跃的5个地址
    return Object.entries(addressCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([address, count]) => ({
        address: `${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
        count
      }));
  };

  // 处理交易状态统计
  const processTransactionStatus = (transactions: Transaction[]) => {
    // 统计交易状态
    const statusCount: Record<string, number> = {};
    
    transactions.forEach(tx => {
      statusCount[tx.status] = (statusCount[tx.status] || 0) + 1;
    });
    
    // 转换为数组格式
    return Object.entries(statusCount).map(([status, count]) => ({ status, count }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-base-200 min-h-screen">
      <h1 className="text-4xl font-bold mb-8 text-center">区块链数据分析仪表盘</h1>
      
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
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
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
                  text: '每日区块链交易量统计'
                }
              }
            }}
          />
        </div>

        {/* 操作类型分布饼图 */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">操作类型分布</h2>
          <Pie
            data={{
              labels: dashboardData.operationTypeStats.map(item => item.type),
              datasets: [{
                data: dashboardData.operationTypeStats.map(item => item.count),
                backgroundColor: [
                  'rgba(75, 192, 192, 0.6)',
                  'rgba(255, 206, 86, 0.6)',
                  'rgba(255, 99, 132, 0.6)',
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

        {/* 活跃地址柱状图 */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">最活跃地址</h2>
          <Bar
            data={{
              labels: dashboardData.addressStats.map(item => item.address),
              datasets: [{
                label: '交易次数',
                data: dashboardData.addressStats.map(item => item.count),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
              }]
            }}
            options={{
              responsive: true,
              indexAxis: 'y' as const, // 横向柱状图
              plugins: {
                legend: {
                  position: 'top' as const,
                }
              }
            }}
          />
        </div>

        {/* 交易状态统计 */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">交易状态统计</h2>
          <Pie
            data={{
              labels: dashboardData.statusStats.map(item => item.status === '1' ? '成功' : (item.status === '0' ? '失败' : item.status)),
              datasets: [{
                data: dashboardData.statusStats.map(item => item.count),
                backgroundColor: [
                  'rgba(75, 192, 192, 0.6)',
                  'rgba(255, 99, 132, 0.6)',
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

export default Dashboard;
