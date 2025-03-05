"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useScaffoldContract, useScaffoldWriteContract, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { isAddress } from "ethers";
import { Address } from "~~/components/scaffold-eth";

const UserAuth: NextPage = () => {
  const router = useRouter();
  const { address } = useAccount();
  const [nftId, setNftId] = useState<number | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [authorizedAddress, setAuthorizedAddress] = useState<string>("");
  const [authorizedAddresses, setAuthorizedAddresses] = useState<string[]>([]);

  const { data: yourContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  const { data: isAuthorizedFromContract } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "isAuthorizedForAuction",
    args: nftId ? [BigInt(nftId), address] : undefined,
  });

  const { data: authorizedAddressesFromContract } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getAuthorizedAddresses",
    args: nftId ? [BigInt(nftId)] : undefined,
  });

  const { writeContractAsync: authorizeNft, isMining: isAuthorizing } = useScaffoldWriteContract("YourCollectible");
  const { writeContractAsync: cancelAuthorization, isMining: isCanceling } = useScaffoldWriteContract("YourCollectible");

  const { data: auctionData } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getAuction",
    args: nftId ? [BigInt(nftId)] : undefined,
  });

  useEffect(() => {
    const storedNft = localStorage.getItem("selectedNft");
    if (storedNft) {
      const parsedNft = JSON.parse(storedNft);
      setNftId(parsedNft);
      checkAuthorization(parsedNft);
      fetchAuthorizedAddresses(parsedNft);
    }
  }, []);

  const checkAuthorization = async (tokenId: number) => {
    try {
      const isAuth = await yourContract?.read.isAuthorizedForAuction([BigInt(tokenId), address]);
      setIsAuthorized(!!isAuth);
    } catch (error) {
      console.error("检查授权状态失败:", error);
      notification.error("检查授权状态失败，请稍后重试");
    }
  };

  useEffect(() => {
    if (authorizedAddressesFromContract) {
      console.log('合约返回的授权地址列表:', authorizedAddressesFromContract);
      setAuthorizedAddresses([...authorizedAddressesFromContract]);
    }
  }, [authorizedAddressesFromContract]);

  const fetchAuthorizedAddresses = async (tokenId: number) => {
    try {
      const addresses = await yourContract?.read.getAuthorizedAddresses([BigInt(tokenId)]);
      if (!addresses) {
        setAuthorizedAddresses([]);
        return;
      }
      console.log('获取授权地址列表:', addresses);
      setAuthorizedAddresses([...addresses]);
    } catch (error) {
      console.error('获取授权地址列表失败:', error);
      notification.error('获取授权地址列表失败，请稍后重试');
      setAuthorizedAddresses([]);
    }
  };

  const handleAuthorize = async () => {
    if (!nftId || !authorizedAddress) {
      notification.error("请输入授权地址");
      return;
    }
    if (!isAddress(authorizedAddress)) {
      notification.error("请输入有效的钱包地址");
      return;
    }
    // 检查地址是否已经在授权列表中
    if (authorizedAddresses.includes(authorizedAddress)) {
      notification.error("该地址已经被授权");
      return;
    }
    try {
      await authorizeNft({
        functionName: "authorizeAuctionEnder",
        args: [BigInt(nftId), authorizedAddress]
      });
      notification.success("授权成功");
      setIsAuthorized(true);
      // 更新授权地址列表
      setAuthorizedAddresses(prev => [...prev, authorizedAddress]);
      setAuthorizedAddress(""); // 清空输入框
    } catch (error) {
      console.error("授权失败:", error);
      notification.error("授权失败");
    }
  };

  const handleCancelAuthorization = async (addressToRevoke: string) => {
    if (!nftId) return;
    try {
      await cancelAuthorization({
        functionName: "revokeAuctionAuthorization",
        args: [BigInt(nftId), addressToRevoke]
      });
      notification.success("取消授权成功");
      // 从列表中移除已取消授权的地址
      setAuthorizedAddresses(prev => prev.filter(addr => addr !== addressToRevoke));
      if (addressToRevoke === address) {
        setIsAuthorized(false);
      }
    } catch (error) {
      console.error("取消授权失败:", error);
      notification.error("取消授权失败");
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (!nftId) {
    return <div className="text-center mt-8">未找到NFT信息</div>;
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-blue-100 to-green-100">
      <div className="w-full max-w-2xl p-8 bg-white rounded-xl shadow-lg">
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.back()}
            className="btn btn-ghost btn-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <h1 className="text-3xl font-bold text-center flex-grow">NFT拍卖详情</h1>
        </div>
        
        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">基本信息</h2>
            <p className="mb-2">Token ID: {nftId}</p>
            {auctionData && auctionData.isActive ? (
              <>
                <p className="mb-2">起拍价: {Number(auctionData.startPrice) / 1e18} ETH</p>
                <p className="mb-2">当前最高出价: {Number(auctionData.highestBid) / 1e18} ETH</p>
                <p className="mb-2">开始时间: {formatTimestamp(Number(auctionData.startTime))}</p>
                <p className="mb-2">结束时间: {formatTimestamp(Number(auctionData.endTime))}</p>
                <p className="mb-2">最高出价者: {auctionData.highestBidder}</p>
              </>
            ) : (
              <p className="mb-2">该NFT当前没有进行中的拍卖</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 授权功能 */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">授权管理</h2>
              <div className="flex flex-col space-y-4">
                <input
                  type="text"
                  placeholder="请输入要授权的钱包地址"
                  value={authorizedAddress}
                  onChange={(e) => setAuthorizedAddress(e.target.value)}
                  className="input input-bordered w-full"
                />
                <button
                  onClick={handleAuthorize}
                  disabled={isAuthorizing}
                  className="btn btn-primary w-full"
                >
                  {isAuthorizing ? "授权中..." : "授权"}
                </button>
              </div>
            </div>

            {/* 授权地址列表 */}
            <div className="bg-gray-50 p-6 rounded-lg mt-4">
              <h2 className="text-xl font-semibold mb-4">已授权地址列表</h2>
              {authorizedAddresses.length > 0 ? (
                <div className="space-y-3">
                  {authorizedAddresses.map((addr, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg shadow">
                      <Address address={addr} />
                      <button
                        onClick={() => handleCancelAuthorization(addr)}
                        className="btn btn-sm btn-error"
                      >
                        取消授权
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">暂无授权地址</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAuth;
