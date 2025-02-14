"use client";

import { useState, useEffect } from "react";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { useAccount } from "wagmi";

interface AccreditationRecord {
  tokenId: string;
  institution: string;
  message: string;
  timestamp: number;
  description?: string;
  images?: string[];
  displayTime: string;
}

const MyAuthMessage = () => {
  const { address } = useAccount();
  const [accreditationRecords, setAccreditationRecords] = useState<AccreditationRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const ITEMS_PER_PAGE = 1;

  const {
    data: accreditationEvents,
    isLoading: isLoadingEvents,
    error: errorReadingEvents,
  } = useScaffoldEventHistory({
    contractName: "YourCollectible",
    eventName: "AccreditationPerformed",
    fromBlock: 0n,
    watch: true,
  });

  useEffect(() => {
    const fetchAccreditationDetails = async () => {
      if (!accreditationEvents || !address) return;

      try {
        // 过滤出当前用户的鉴定记录
        const userEvents = accreditationEvents.filter(
          event => event.args.institution.toLowerCase() === address.toLowerCase()
        );

        // 获取每条记录的详细信息
        const records = await Promise.all(
          userEvents.map(async event => {
            try {
              const response = await fetch(event.args.message);
              const jsonData = await response.json();
              
              return {
                tokenId: event.args.tokenId.toString(),
                institution: event.args.institution,
                message: event.args.message,
                timestamp: Number(event.args.timestamp),
                displayTime: new Date(Number(event.args.timestamp) * 1000).toLocaleString(),
                description: jsonData.description,
                images: jsonData.images,
              };
            } catch (error) {
              console.error("Error fetching accreditation data:", error);
              return null;
            }
          })
        );

        // 过滤掉加载失败的记录并按时间排序
        const validRecords = records
          .filter((record): record is AccreditationRecord => record !== null)
          .sort((a, b) => b.timestamp - a.timestamp);

        setAccreditationRecords(validRecords);
      } catch (error) {
        console.error("Error processing accreditation records:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccreditationDetails();
  }, [accreditationEvents, address]);

  // 计算分页数据
  const paginatedRecords = accreditationRecords.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (isLoading || isLoadingEvents) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (errorReadingEvents) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-red-500">加载鉴定记录时出错: {errorReadingEvents.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">我的鉴定记录</h1>
      </div>

      {paginatedRecords.length > 0 ? (
        <div className="flex flex-col items-center">
          {/* 显示当前记录 */}
          <div className="w-full max-w-3xl bg-white shadow-lg rounded-lg p-6 mb-6">
            <div className="mb-6">
              <p className="text-xl font-semibold mb-4">NFT ID: #{paginatedRecords[0].tokenId}</p>
              <p className="text-lg mb-2">鉴定意见: {paginatedRecords[0].description}</p>
              <p className="text-gray-600">鉴定时间: {paginatedRecords[0].displayTime}</p>
            </div>

            {paginatedRecords[0].images && paginatedRecords[0].images.length > 0 && (
              <div className="mt-6">
                <p className="text-lg font-semibold mb-4">鉴定图片：</p>
                <div className="grid grid-cols-2 gap-4">
                  {paginatedRecords[0].images.map((image, imgIndex) => (
                    <div key={imgIndex} className="relative aspect-square">
                      <img 
                        src={image} 
                        alt={`鉴定图片 ${imgIndex + 1}`} 
                        className="rounded-lg object-cover w-full h-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 分页控制 */}
          <div className="flex items-center justify-center space-x-4 mt-4">
            <button 
              className="btn btn-secondary" 
              onClick={() => setCurrentPage(prev => prev - 1)} 
              disabled={currentPage === 1}
            >
              上一条
            </button>
            <span className="text-lg">
              第 {currentPage} / {accreditationRecords.length} 条
            </span>
            <button 
              className="btn btn-secondary" 
              onClick={() => setCurrentPage(prev => prev + 1)} 
              disabled={currentPage >= accreditationRecords.length}
            >
              下一条
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-center items-center min-h-[400px]">
          <p className="text-xl text-gray-600">暂无鉴定记录</p>
        </div>
      )}
    </div>
  );
};

export default MyAuthMessage;
