"use client";

import { useState, useEffect } from "react";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { useAccount } from "wagmi";

interface IntegralRecord {
  tokenId: string;
  integral: string;
  timestamp: number;
  displayTime: string;
}

const IntegralPage = () => {
  const { address } = useAccount();
  const [integralRecords, setIntegralRecords] = useState<IntegralRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 2;

  const {
    data: integralEvents,
    isLoading: isLoadingEvents,
    error: errorReadingEvents,
  } = useScaffoldEventHistory({
    contractName: "YourCollectible",
    eventName: "Integral",
    fromBlock: 0n,
    watch: true,
  });

  useEffect(() => {
    if (!integralEvents || !address) return;

    // 过滤并格式化积分记录
    const records = integralEvents
      .filter(event => event.args.sender.toLowerCase() === address.toLowerCase())
      .map(event => ({
        tokenId: event.args.tokenId.toString(),
        integral: event.args.integral.toString(),
        timestamp: Number(event.args.timestamp),
        displayTime: new Date(Number(event.args.timestamp) * 1000).toLocaleString(),
      }))
      .sort((a, b) => b.timestamp - a.timestamp); // 按时间降序排序

    setIntegralRecords(records);
  }, [integralEvents, address]);

  // 计算分页数据
  const paginatedRecords = integralRecords.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (isLoadingEvents) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (errorReadingEvents) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-red-500">加载积分记录时出错: {errorReadingEvents.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">积分记录</h1>
        <button 
          className="btn btn-primary" 
          onClick={() => window.history.back()}
        >
          返回
        </button>
      </div>

      {paginatedRecords.length > 0 ? (
        <div className="flex flex-col items-center">
          {/* 显示当前页的记录 */}
          <div className="w-full max-w-3xl space-y-4">
            {paginatedRecords.map((record, index) => (
              <div key={index} className="bg-white shadow-lg rounded-lg p-6">
                <div className="mb-2">
                  <p className="text-xl font-semibold mb-2">NFT ID: #{record.tokenId}</p>
                  <p className="text-lg mb-2">获得积分: {record.integral}</p>
                  <p className="text-gray-600">时间: {record.displayTime}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 分页控制 */}
          <div className="flex items-center justify-center space-x-4 mt-6">
            <button 
              className="btn btn-secondary" 
              onClick={() => setCurrentPage(prev => prev - 1)} 
              disabled={currentPage === 1}
            >
              上一页
            </button>
            <span className="text-lg">
              第 {currentPage} / {Math.ceil(integralRecords.length / ITEMS_PER_PAGE)} 页
            </span>
            <button 
              className="btn btn-secondary" 
              onClick={() => setCurrentPage(prev => prev + 1)} 
              disabled={currentPage >= Math.ceil(integralRecords.length / ITEMS_PER_PAGE)}
            >
              下一页
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-center items-center min-h-[400px]">
          <p className="text-xl text-gray-600">暂无积分记录</p>
        </div>
      )}
    </div>
  );
};

export default IntegralPage;
