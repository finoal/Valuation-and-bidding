"use client";

import { useState, useEffect } from "react";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useSearchParams } from "next/navigation"; // 用于获取存储的 tokenId
import { Address } from "~~/components/scaffold-eth";

const NFTMessage = () => {
  const searchParams = useSearchParams();
  const tokenId = searchParams.get("tokenId"); // 从 URL 查询参数中获取 tokenId
  const [nftData, setNftData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { data: nftDetails } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getNftItem",
    args: tokenId ? [BigInt(tokenId)] : undefined,
    watch: true,
  });

  useEffect(() => {
    if (nftDetails) {
      setNftData(nftDetails);
      setIsLoading(false);
    }
  }, [nftDetails]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!nftData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl font-semibold">未找到 NFT 信息</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-4">NFT 详情</h1>
      <div className="bg-white shadow-lg rounded-lg p-6">
        <img src={nftData.tokenUri} alt="NFT Image" className="w-full h-64 object-cover rounded-lg mb-4" />
        <h2 className="text-2xl font-bold">{nftData.name || "未命名"}</h2>
        <p className="text-gray-600 mt-2">{nftData.description || "无描述"}</p>
        <div className="mt-4">
          <p className="text-lg font-semibold">所有人：</p>
          <Address address={nftData.seller} />
        </div>
        <div className="mt-2">
          <p className="text-lg font-semibold">被鉴定次数：{nftData.accreditedCount}</p>
        </div>
      </div>
    </div>
  );
};

export default NFTMessage; // **确保正确导出 React 组件**
