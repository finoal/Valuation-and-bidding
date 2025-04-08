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
  RadialLinearScale,
  Filler,
  DoughnutController
} from 'chart.js';
import { Line, Pie, Bar, Doughnut } from 'react-chartjs-2';
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
  BarElement,
  RadialLinearScale,
  Filler,
  DoughnutController
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

// 拍品信息
interface NFTItem {
  id: number;
  name: string;
  count: number;
}

// 用户活跃度
interface UserActivity {
  address: string;
  count: number;
  lastActive: string;
}

interface DashboardData {
  dailyTransactions: { date: string; count: number }[];
  operationTypeStats: { type: string; count: number }[];
  addressStats: { address: string; count: number }[];
  statusStats: { status: string; count: number }[];
  operationTrends: {
    dates: string[];
    鉴定操作: number[];
    授权操作: number[];
    拍卖竞价: number[];
  };
  gasConsumption: { operation: string; avgGas: number }[];
  hourlyActivity: { hour: number; count: number }[];
  // 新增数据类型
  popularNFTs: NFTItem[];
  bidPriceStats: { date: string; avgPrice: number; maxPrice: number; minPrice: number }[];
  userActivityStats: UserActivity[];
  addressInteractions: { source: string; target: string; value: number }[];
  auctionSuccessRate: { status: string; count: number }[];
}

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    dailyTransactions: [],
    operationTypeStats: [],
    addressStats: [],
    statusStats: [],
    operationTrends: {
      dates: [],
      鉴定操作: [],
      授权操作: [],
      拍卖竞价: []
    },
    gasConsumption: [],
    hourlyActivity: [],
    // 新增数据初始化
    popularNFTs: [],
    bidPriceStats: [],
    userActivityStats: [],
    addressInteractions: [],
    auctionSuccessRate: []
  });
  const [isLoading, setIsLoading] = useState(true);
  // 添加时间范围过滤
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month' | 'all'>('week');

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
          
          // 处理操作类型趋势数据 (三线图)
          const operationTrends = processOperationTrends(transactions);

          // 处理各操作类型平均Gas消耗
          const gasConsumption = processGasConsumption(transactions);

          // 处理每小时活跃度
          const hourlyActivity = processHourlyActivity(transactions);
          
          // 新增数据处理
          const popularNFTs = processPopularNFTs(transactions);
          const bidPriceStats = processBidPriceStats(transactions);
          const userActivityStats = processUserActivityStats(transactions);
          const addressInteractions = processAddressInteractions(transactions);
          const auctionSuccessRate = processAuctionSuccessRate(transactions);
          
          setDashboardData({
            dailyTransactions,
            operationTypeStats,
            addressStats,
            statusStats,
            operationTrends,
            gasConsumption,
            hourlyActivity,
            popularNFTs,
            bidPriceStats,
            userActivityStats,
            addressInteractions,
            auctionSuccessRate
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
  }, [dateRange]);

  // 处理每日交易量统计
  const processDailyTransactions = (transactions: Transaction[]) => {
    // 按日期分组交易
    const dailyStats = transactions.reduce((acc: Record<string, number>, tx: Transaction) => {
      // 格式化日期为 YYYY-MM-DD
      const date = new Date(tx.block_timestamp).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // 获取最近15天的日期
    const today = new Date();
    const last15Days = Array.from({ length: 15 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    // 生成每日交易量数据
    const result = last15Days.map(date => ({
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

  // 处理操作类型趋势数据 (三线图)
  const processOperationTrends = (transactions: Transaction[]) => {
    // 获取最近10天的日期
    const today = new Date();
    const last10Days = Array.from({ length: 10 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();
    
    // 初始化各操作类型的每日计数
    const dailyOperations: Record<string, Record<string, number>> = {};
    last10Days.forEach(date => {
      dailyOperations[date] = {
        '鉴定操作': 0,
        '授权操作': 0,
        '拍卖竞价': 0
      };
    });
    
    // 统计每日各类型操作数量
    transactions.forEach(tx => {
      const date = new Date(tx.block_timestamp).toISOString().split('T')[0];
      if (dailyOperations[date]) {
        if (tx.operation_description.includes("鉴定")) {
          dailyOperations[date]['鉴定操作']++;
        } else if (tx.operation_description.includes("授权")) {
          dailyOperations[date]['授权操作']++;
        } else if (tx.operation_description.includes("参与竞价") || tx.operation_description.includes("拍卖")) {
          dailyOperations[date]['拍卖竞价']++;
        }
      }
    });
    
    // 转换为三线图所需格式
    return {
      dates: last10Days,
      鉴定操作: last10Days.map(date => dailyOperations[date]['鉴定操作']),
      授权操作: last10Days.map(date => dailyOperations[date]['授权操作']),
      拍卖竞价: last10Days.map(date => dailyOperations[date]['拍卖竞价'])
    };
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
      // 规范化状态，将success映射为1
      const normalizedStatus = tx.status.toLowerCase() === 'success' ? '1' : tx.status;
      statusCount[normalizedStatus] = (statusCount[normalizedStatus] || 0) + 1;
    });
    
    // 转换为数组格式
    return Object.entries(statusCount).map(([status, count]) => ({ status, count }));
  };

  // 处理Gas消耗统计
  const processGasConsumption = (transactions: Transaction[]) => {
    // 各操作类型的总Gas和计数
    const operationGas: Record<string, { total: number, count: number }> = {
      '鉴定操作': { total: 0, count: 0 },
      '授权操作': { total: 0, count: 0 },
      '拍卖/竞价': { total: 0, count: 0 },
      '创建操作': { total: 0, count: 0 },
      '更新操作': { total: 0, count: 0 },
      '其他': { total: 0, count: 0 }
    };
    
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
      
      operationGas[type].total += parseInt(tx.gas || '0');
      operationGas[type].count++;
    });
    
    // 计算平均Gas消耗并转换为数组格式
    return Object.entries(operationGas)
      .filter(([, data]) => data.count > 0)
      .map(([operation, data]) => ({
        operation,
        avgGas: Math.round(data.total / data.count)
      }));
  };

  // 处理每小时活跃度
  const processHourlyActivity = (transactions: Transaction[]) => {
    // 初始化24小时的计数
    const hourlyCount: number[] = Array(24).fill(0);
    
    transactions.forEach(tx => {
      const hour = new Date(tx.block_timestamp).getHours();
      hourlyCount[hour]++;
    });
    
    return hourlyCount.map((count, hour) => ({ hour, count }));
  };

  // 新增: 处理热门NFT
  const processPopularNFTs = (transactions: Transaction[]) => {
    const nftMap: Record<string, { id: number; name: string; count: number }> = {};
    
    transactions.forEach(tx => {
      // 提取NFT ID和名称的正则表达式
      // 匹配模式包括：
      // - 拍品ID: 数字, 名称: 任意文本
      // - 拍品ID: 数字, 名称: 任意文本, 出价金额: 数字 ETH
      // - Token ID: 数字, 名称: 任意文本
      let match = tx.operation_description.match(/(?:拍品ID|Token ID): (\d+)(?:, 名称: ([^,]+))?/);
      
      if (match) {
        const id = parseInt(match[1]);
        // 如果名称不在匹配组中，尝试从整个描述中提取
        let name = match[2];
        if (!name) {
          const nameMatch = tx.operation_description.match(/名称: ([^,]+)/);
          name = nameMatch ? nameMatch[1] : `拍品${id}`;
        }
        
        const key = `${id}-${name}`;
        
        if (!nftMap[key]) {
          nftMap[key] = { id, name, count: 0 };
        }
        nftMap[key].count++;
      } else if (tx.operation_description.includes("创建拍品")) {
        // 处理创建拍品格式: "创建拍品 - 印章"
        const nameMatch = tx.operation_description.match(/创建拍品 - (.+)/);
        if (nameMatch) {
          const name = nameMatch[1];
          // 使用交易ID作为临时ID
          const id = tx.id;
          const key = `创建-${name}`;
          
          if (!nftMap[key]) {
            nftMap[key] = { id, name, count: 0 };
          }
          nftMap[key].count++;
        }
      }
    });
    
    // 排序并返回前10个热门NFT
    return Object.values(nftMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  // 新增: 处理竞价金额统计
  const processBidPriceStats = (transactions: Transaction[]) => {
    // 按日期分组的竞价金额
    const dailyBids: Record<string, { prices: number[]; date: string }> = {};
    
    transactions.forEach(tx => {
      if (tx.operation_description.includes("参与竞价")) {
        const date = new Date(tx.block_timestamp).toISOString().split('T')[0];
        const priceMatch = tx.operation_description.match(/出价金额: (\d+\.?\d*) ETH/);
        
        if (priceMatch) {
          const price = parseFloat(priceMatch[1]);
          if (!dailyBids[date]) {
            dailyBids[date] = { prices: [], date };
          }
          dailyBids[date].prices.push(price);
        }
      }
    });
    
    // 计算每日平均、最高和最低出价
    return Object.values(dailyBids)
      .map(({ date, prices }) => {
        return {
          date,
          avgPrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
          maxPrice: Math.max(...prices),
          minPrice: Math.min(...prices)
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10); // 最近10天
  };

  // 新增: 处理用户活跃度统计
  const processUserActivityStats = (transactions: Transaction[]) => {
    const userActivity: Record<string, { address: string; count: number; timestamps: string[] }> = {};
    
    transactions.forEach(tx => {
      const address = tx.from_address;
      if (!userActivity[address]) {
        userActivity[address] = { address, count: 0, timestamps: [] };
      }
      userActivity[address].count++;
      userActivity[address].timestamps.push(tx.block_timestamp);
    });
    
    // 排序并返回最活跃的用户
    return Object.values(userActivity)
      .map(({ address, count, timestamps }) => {
        // 获取最近活动时间
        const sortedTimestamps = [...timestamps].sort((a, b) => 
          new Date(b).getTime() - new Date(a).getTime()
        );
        
        return {
          address: `${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
          count,
          lastActive: sortedTimestamps[0]
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  // 新增: 处理地址交互
  const processAddressInteractions = (transactions: Transaction[]) => {
    const interactions: Record<string, Record<string, number>> = {};
    
    transactions.forEach(tx => {
      const source = `${tx.from_address.substring(0, 6)}...${tx.from_address.substring(tx.from_address.length - 4)}`;
      const target = `${tx.to_address.substring(0, 6)}...${tx.to_address.substring(tx.to_address.length - 4)}`;
      
      if (!interactions[source]) {
        interactions[source] = {};
      }
      if (!interactions[source][target]) {
        interactions[source][target] = 0;
      }
      interactions[source][target]++;
    });
    
    // 转换为数组格式
    const result: { source: string; target: string; value: number }[] = [];
    
    Object.entries(interactions).forEach(([source, targets]) => {
      Object.entries(targets).forEach(([target, value]) => {
        if (value > 2) { // 只包含交互次数超过2次的
          result.push({ source, target, value });
        }
      });
    });
    
    return result.sort((a, b) => b.value - a.value).slice(0, 10);
  };

  // 新增: 处理拍卖成功率
  const processAuctionSuccessRate = (transactions: Transaction[]) => {
    const auctionStats: Record<string, number> = {
      "已成交": 0,
      "未成交": 0,
      "进行中": 0
    };
    
    // 统计创建的拍卖和结束的拍卖
    const createdAuctions = new Set<string>();
    const completedAuctions = new Set<string>();
    
    transactions.forEach(tx => {
      if (tx.operation_description.includes("创建拍卖")) {
        const match = tx.operation_description.match(/拍品ID: (\d+)/);
        if (match) {
          createdAuctions.add(match[1]);
        }
      } else if (tx.operation_description.includes("结束拍卖")) {
        const match = tx.operation_description.match(/拍品ID: (\d+)/);
        if (match) {
          completedAuctions.add(match[1]);
          auctionStats["已成交"]++;
        }
      }
    });
    
    // 计算进行中的拍卖
    createdAuctions.forEach(id => {
      if (!completedAuctions.has(id)) {
        auctionStats["进行中"]++;
      }
    });
    
    return Object.entries(auctionStats)
      .map(([status, count]) => ({ status, count }))
      .filter(item => item.count > 0);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-base-200 min-h-screen">
      <h1 className="text-3xl font-bold mb-4 text-center">拍品拍卖与鉴定数据分析</h1>
      
      {/* 时间范围过滤 */}
      <div className="flex justify-center mb-6">
        <div className="btn-group">
          <button 
            onClick={() => setDateRange('day')} 
            className={`btn btn-sm ${dateRange === 'day' ? 'btn-active' : ''}`}
          >
            今日
          </button>
          <button 
            onClick={() => setDateRange('week')} 
            className={`btn btn-sm ${dateRange === 'week' ? 'btn-active' : ''}`}
          >
            本周
          </button>
          <button 
            onClick={() => setDateRange('month')} 
            className={`btn btn-sm ${dateRange === 'month' ? 'btn-active' : ''}`}
          >
            本月
          </button>
          <button 
            onClick={() => setDateRange('all')} 
            className={`btn btn-sm ${dateRange === 'all' ? 'btn-active' : ''}`}
          >
            全部
          </button>
        </div>
      </div>
      
      {/* 顶部概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md text-center">
          <div className="text-xl font-bold text-primary">
            {dashboardData.dailyTransactions.reduce((sum, item) => sum + item.count, 0)}
          </div>
          <div className="text-sm opacity-70">总交易量</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md text-center">
          <div className="text-xl font-bold text-secondary">
            {dashboardData.auctionSuccessRate.find(s => s.status === '已成交')?.count || 0}
          </div>
          <div className="text-sm opacity-70">已成交拍卖</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md text-center">
          <div className="text-xl font-bold text-accent">
            {dashboardData.bidPriceStats.length > 0 
              ? Math.max(...dashboardData.bidPriceStats.map(d => d.maxPrice)).toFixed(1) + " ETH" 
              : "0 ETH"}
          </div>
          <div className="text-sm opacity-70">最高出价</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md text-center">
          <div className="text-xl font-bold text-error">
            {dashboardData.operationTypeStats.find(t => t.type === '鉴定操作')?.count || 0}
          </div>
          <div className="text-sm opacity-70">鉴定次数</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* 交易量趋势图 */}
        <div className="bg-white p-4 rounded-lg shadow-md col-span-1 md:col-span-2 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-3">交易量趋势</h2>
          <div className="h-64">
            <Line
              data={{
                labels: dashboardData.dailyTransactions.map(item => item.date.substring(5)), // 只显示月-日
                datasets: [{
                  label: '每日交易量',
                  data: dashboardData.dailyTransactions.map(item => item.count),
                  borderColor: 'rgb(75, 192, 192)',
                  backgroundColor: 'rgba(75, 192, 192, 0.2)',
                  tension: 0.3,
                  fill: true
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                    labels: {
                      font: {
                        size: 12
                      }
                    }
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* 拍卖状态统计 */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-3">拍卖状态分布</h2>
          <div className="h-64">
            <Doughnut
              data={{
                labels: dashboardData.auctionSuccessRate.map(item => item.status),
                datasets: [{
                  data: dashboardData.auctionSuccessRate.map(item => item.count),
                  backgroundColor: [
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                  ],
                  borderColor: 'white',
                  borderWidth: 1
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: {
                      font: {
                        size: 11
                      }
                    }
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a: any, b: any) => a + b, 0);
                        const percentage = Math.round((value as number / total) * 100);
                        return `${label}: ${value} (${percentage}%)`;
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* 三线图：操作类型趋势 */}
        <div className="bg-white p-4 rounded-lg shadow-md col-span-1 md:col-span-2 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-3">操作类型趋势对比</h2>
          <div className="h-64">
            <Line
              data={{
                labels: dashboardData.operationTrends.dates.map(date => date.substring(5)), // 只显示月-日
                datasets: [
                  {
                    label: '鉴定操作',
                    data: dashboardData.operationTrends.鉴定操作,
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    tension: 0.3,
                    borderWidth: 2
                  },
                  {
                    label: '授权操作',
                    data: dashboardData.operationTrends.授权操作,
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    tension: 0.3,
                    borderWidth: 2
                  },
                  {
                    label: '拍卖/竞价',
                    data: dashboardData.operationTrends.拍卖竞价,
                    borderColor: 'rgb(255, 206, 86)',
                    backgroundColor: 'rgba(255, 206, 86, 0.1)',
                    tension: 0.3,
                    borderWidth: 2
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                    labels: {
                      padding: 10,
                      font: {
                        size: 11
                      }
                    }
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false
                  },
                  title: {
                    display: true,
                    text: '各类操作随时间的变化趋势',
                    font: {
                      size: 13
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* 新增: 竞价金额趋势图 */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-3">竞价金额趋势</h2>
          <div className="h-64">
            <Line
              data={{
                labels: dashboardData.bidPriceStats.map(item => item.date.substring(5)),
                datasets: [
                  {
                    label: '平均出价',
                    data: dashboardData.bidPriceStats.map(item => item.avgPrice),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    borderWidth: 2,
                    tension: 0.3
                  },
                  {
                    label: '最高出价',
                    data: dashboardData.bidPriceStats.map(item => item.maxPrice),
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    borderWidth: 2,
                    tension: 0.3
                  },
                  {
                    label: '最低出价',
                    data: dashboardData.bidPriceStats.map(item => item.minPrice),
                    borderColor: 'rgb(54, 162, 235)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    borderWidth: 2,
                    tension: 0.3
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                    labels: {
                      font: {
                        size: 10
                      }
                    }
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.dataset.label || '';
                        const value = context.raw as number;
                        return `${label}: ${value.toFixed(2)} ETH`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'ETH'
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* 热门拍品排行 */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-3">热门拍品排行</h2>
          <div className="h-64 overflow-auto">
            <table className="table table-xs table-zebra w-full">
              <thead>
                <tr>
                  <th>排名</th>
                  <th>拍品ID</th>
                  <th>名称</th>
                  <th>交易</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.popularNFTs.map((nft, index) => (
                  <tr key={nft.id} className={index < 3 ? "font-semibold" : ""}>
                    <td>{index + 1}</td>
                    <td>{nft.id}</td>
                    <td>{nft.name}</td>
                    <td className="text-right">{nft.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 操作类型分布饼图 */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-3">操作类型分布</h2>
          <div className="h-64">
            <Doughnut
              data={{
                labels: dashboardData.operationTypeStats.map(item => item.type),
                datasets: [{
                  data: dashboardData.operationTypeStats.map(item => item.count),
                  backgroundColor: [
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)',
                  ],
                  borderColor: 'white',
                  borderWidth: 1
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: {
                      font: {
                        size: 10
                      }
                    }
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a: any, b: any) => a + b, 0);
                        const percentage = Math.round((value as number / total) * 100);
                        return `${label}: ${value} (${percentage}%)`;
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Gas消耗柱状图 */}
        <div className="bg-white p-4 rounded-lg shadow-md lg:col-span-2">
          <h2 className="text-lg font-semibold mb-3">平均Gas消耗</h2>
          <div className="h-56">
            <Bar
              data={{
                labels: dashboardData.gasConsumption.map(item => item.operation),
                datasets: [{
                  label: '平均Gas消耗',
                  data: dashboardData.gasConsumption.map(item => item.avgGas),
                  backgroundColor: 'rgba(153, 102, 255, 0.6)',
                  borderColor: 'rgba(153, 102, 255, 1)',
                  borderWidth: 1
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y' as const,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const value = context.raw as number;
                        return `Gas: ${value.toLocaleString()}`;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => {
                        const numValue = value as number;
                        if (numValue >= 1000) {
                          return (numValue / 1000) + 'k';
                        }
                        return value;
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* 活跃地址柱状图 */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-3">最活跃地址</h2>
          <div className="h-64">
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
                maintainAspectRatio: false,
                indexAxis: 'y' as const,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        return `交易次数: ${context.raw}`;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* 交易状态统计 */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-3">交易状态统计</h2>
          <div className="h-64">
            <Pie
              data={{
                labels: dashboardData.statusStats.map(item => item.status === '1' || item.status === 'success' ? '成功' : (item.status === '0' ? '失败' : item.status)),
                datasets: [{
                  data: dashboardData.statusStats.map(item => item.count),
                  backgroundColor: [
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                  ],
                  borderColor: 'white',
                  borderWidth: 1
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: {
                      font: {
                        size: 11
                      }
                    }
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a: any, b: any) => a + b, 0);
                        const percentage = Math.round((value as number / total) * 100);
                        return `${label}: ${value} (${percentage}%)`;
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* 每小时活跃度 */}
        <div className="bg-white p-4 rounded-lg shadow-md col-span-1 md:col-span-2 lg:col-span-3">
          <h2 className="text-lg font-semibold mb-3">每小时交易活跃度</h2>
          <div className="h-48">
            <Bar
              data={{
                labels: dashboardData.hourlyActivity.map(item => `${item.hour}:00`),
                datasets: [{
                  label: '交易数量',
                  data: dashboardData.hourlyActivity.map(item => item.count),
                  backgroundColor: 'rgba(255, 159, 64, 0.6)',
                  borderColor: 'rgba(255, 159, 64, 1)',
                  borderWidth: 1
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      title: (tooltipItems) => {
                        return `${tooltipItems[0].label} - ${parseInt(tooltipItems[0].label) + 1}:00`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
