"use client";

import { useState, useEffect } from "react";
import { Address } from "~~/components/scaffold-eth";

const NFTMessage = () => {
  const [nftData, setNftData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accreditationRecords, setAccreditationRecords] = useState<any[]>([]);
  const [auctionRecords, setAuctionRecords] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // 假数据加载，模拟获取数据
  useEffect(() => {
    setTimeout(() => {
      // 加载数据
      const selectedNft = localStorage.getItem("selectedNft");
      console.log(selectedNft);
      if (selectedNft) {
        setNftData(JSON.parse(selectedNft));
      }
      setAccreditationRecords([
        { institution: "Institution 1", message: "Accredited in 2023" },
        { institution: "Institution 2", message: "Accredited in 2024" },
        { institution: "Institution 3", message: "Accredited in 2025" },
      ]);
      setAuctionRecords([
        { bidder: "0xF98b6CE9879706221c05177Dd546f4fcdDE3AA76", bid: "5 ETH", timestamp: "2024-01-01 10:00" },
        { bidder: "0xF98b6CE9879706221c05177Dd546f4fcdDE3AA76", bid: "6 ETH", timestamp: "2024-01-02 14:30" },
      ]);
      setIsLoading(false);
    }, 2000);
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* 返回按钮和标题 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">NFT 详情</h1>
        <button
          className="btn btn-primary"
          onClick={() => window.history.back()}
        >
          返回
        </button>
      </div>

      {/* Layout for NFT Details and Records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Section: NFT Image and Basic Information */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex flex-col items-center">
            <img
              src={nftData.image}
              alt="NFT Image"
              className="w-64 h-64 object-cover rounded-lg mb-4"
            />
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">拍品名称：{nftData.name || "未命名"}</h2>
              <p className="text-lg font-semibold mb-2">拍品描述：{nftData.description || "无描述"}</p>
              <div className="mb-2">
                <p className="text-lg font-semibold">被鉴定次数：{nftData.accreditedCount}</p>
              </div>
              {nftData.bidCount ? (
                <div className="mb-2">
                  <p className="text-lg font-semibold">竞拍次数：{nftData.bidCount}</p>
                </div>
              ) : (
                <div className="mb-2">
                  <p className="text-lg font-semibold text-red-500">竞拍尚未开始</p>
                </div>
              )}
              <div className="mb-2">
                <span className="text-lg font-semibold">起拍价:</span>
                <span className="text-lg font-semibold ml-2">
                  {isNaN(Number(nftData.startingBid) / 1e18) ? "未设置" : `${Number(nftData.startingBid) / 1e18} ETH`}
                </span>
              </div>
              <div className="mb-2">
                <span className="text-lg font-semibold">当前出价:</span>
                <span className="text-lg font-semibold ml-2">
                  {isNaN(Number(nftData.currentBid) / 1e18) ? "未开始竞拍" : `${Number(nftData.currentBid) / 1e18} ETH`}
                </span>
              </div>
              <div className="mb-4">
                <span className="text-lg font-semibold">最高出价者:</span>
                {nftData.highestBidder ? <Address address={nftData.highestBidder} /> : "未开始竞拍"}
              </div>
              <div className="mb-4">
                <p className="text-lg font-semibold">所有人：<Address address={nftData.owner} /></p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Accreditation Records and Auction Records */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h3 className="text-2xl font-semibold mb-4">鉴定记录</h3>
          {/* Accreditation Records */}
          <div className="overflow-auto max-h-[300px] mb-6">
            {accreditationRecords.length > 0 ? (
              <ul>
                {accreditationRecords.map((record, index) => (
                  <li key={index} className="mb-4">
                    <p className="font-semibold">{record.institution}</p>
                    <p>{record.message}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">暂无鉴定记录</p>
            )}
          </div>

          {/* Pagination for Accreditation Records */}
          <div className="flex justify-center mb-6">
            <button className="btn btn-secondary" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
              上一页
            </button>
            <span className="mx-4">第 {currentPage} 页</span>
            <button className="btn btn-secondary" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === Math.ceil(accreditationRecords.length / 5)}>
              下一页
            </button>
          </div>

          <h3 className="text-2xl font-semibold mb-4">竞拍记录</h3>
          {/* Auction Records */}
          <div className="overflow-auto max-h-[300px]">
            {auctionRecords.length > 0 ? (
              <ul>
                {auctionRecords.map((record, index) => (
                  <li key={index} className="mb-4">
                    <p className="font-semibold">出价者: <Address address={record.bidder} /></p>
                    <p>出价金额: {record.bid}</p>
                    <p>时间: {record.timestamp}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600">暂无竞拍记录</p>
            )}
          </div>

          {/* Pagination for Auction Records */}
          <div className="flex justify-center mt-6">
            <button className="btn btn-secondary" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
              上一页
            </button>
            <span className="mx-4">第 {currentPage} 页</span>
            <button className="btn btn-secondary" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === Math.ceil(auctionRecords.length / 5)}>
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFTMessage;