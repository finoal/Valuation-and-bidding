"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/navigation";
import { useAccount, usePublicClient } from "wagmi";
import { useScaffoldContract, useScaffoldWriteContract, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { isAddress } from "ethers";
import { Address } from "~~/components/scaffold-eth";
import axios from "axios";
import { Hash } from "viem";

const UserAuth: NextPage = () => {
  const router = useRouter();
  const { address } = useAccount();
  const publicClient = usePublicClient(); // 获取区块链客户端
  const [nftId, setNftId] = useState<number | null>(null);
  const [_isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [authorizedAddress, setAuthorizedAddress] = useState<string>("");
  const [authorizedAddresses, setAuthorizedAddresses] = useState<string[]>([]);

  const { data: yourContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  const { data: authorizedAddressesFromContract } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getAuthorizedAddresses",
    args: nftId ? [BigInt(nftId)] as const : undefined,
  });

  const { writeContractAsync: authorizeNft, isMining: isAuthorizing } = useScaffoldWriteContract("YourCollectible");
  const { writeContractAsync: cancelAuthorization } = useScaffoldWriteContract("YourCollectible");

  const { data: auctionData } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getAuction",
    args: nftId ? [BigInt(nftId)] as const : undefined,
  });

  // 将交易数据保存到数据库
  const saveTransactionToDatabase = async (
    blockNumber: bigint,
    blockTimestamp: bigint,
    transactionHash: Hash,
    fromAddress: string,
    toAddress: string, 
    gas: bigint,
    status: "success" | "reverted" | string,
    operationDescription: string
  ) => {
    try {
      const response = await axios.post('http://localhost:3001/addTransaction', {
        blockNumber: blockNumber.toString(),
        blockTimestamp: new Date(Number(blockTimestamp) * 1000).toISOString().slice(0, 19).replace('T', ' '),
        transactionHash,
        fromAddress,
        toAddress,
        gas: gas.toString(),
        status,
        operationDescription
      });
      
      console.log('交易数据已保存到数据库:', response.data);
      return response.data;
    } catch (error) {
      console.error('保存交易数据失败:', error);
      throw error;
    }
  };

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
      if (!address) {
        console.error("用户地址未连接");
        return;
      }
      const isAuth = await yourContract?.read.isAuthorizedForAuction([BigInt(tokenId), address as `0x${string}`]);
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
      setAuthorizedAddresses(addresses);
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
    if (authorizedAddresses.includes(authorizedAddress)) {
      notification.error("该地址已经被授权");
      return;
    }
    
    const notificationId = notification.loading("正在授权...");
    
    try {
      const txHash = await authorizeNft({
        functionName: "authorizeAuctionEnder",
        args: [BigInt(nftId), authorizedAddress]
      });
      
      if (!publicClient || !txHash) {
        notification.remove(notificationId);
        notification.error("获取交易信息失败");
        return;
      }
      
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: txHash as Hash
      });
      
      const block = await publicClient.getBlock({ 
        blockNumber: receipt.blockNumber 
      });
      
      await saveTransactionToDatabase(
        receipt.blockNumber,
        block.timestamp,
        receipt.transactionHash,
        address || '',
        receipt.to || '',
        receipt.gasUsed,
        receipt.status,
        `添加授权 - Token ID: ${nftId}, 被授权地址: ${authorizedAddress}`
      );
      
      notification.remove(notificationId);
      notification.success("授权成功");
      setIsAuthorized(true);
      
      if (!authorizedAddresses.includes(authorizedAddress)) {
        setAuthorizedAddresses(prev => [...prev, authorizedAddress]);
      }
      
      setAuthorizedAddress("");
      
      if (nftId) {
        fetchAuthorizedAddresses(nftId);
      }
      
    } catch (error) {
      notification.remove(notificationId);
      console.error("授权失败:", error);
      notification.error("授权失败");
    }
  };

  const handleCancelAuthorization = async (addressToRevoke: string) => {
    if (!nftId) return;
    
    const notificationId = notification.loading("正在取消授权...");
    
    try {
      const txHash = await cancelAuthorization({
        functionName: "revokeAuctionAuthorization",
        args: [BigInt(nftId), addressToRevoke]
      });
      
      if (!publicClient || !txHash) {
        notification.remove(notificationId);
        notification.error("获取交易信息失败");
        return;
      }
      
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: txHash as Hash
      });
      
      const block = await publicClient.getBlock({ 
        blockNumber: receipt.blockNumber 
      });
      
      await saveTransactionToDatabase(
        receipt.blockNumber,
        block.timestamp,
        receipt.transactionHash,
        address || '',
        receipt.to || '',
        receipt.gasUsed,
        receipt.status,
        `取消授权 - Token ID: ${nftId}, 被取消授权地址: ${addressToRevoke}`
      );
      
      notification.remove(notificationId);
      notification.success("取消授权成功");
      
      setAuthorizedAddresses(prev => prev.filter(addr => addr !== addressToRevoke));
      
      if (addressToRevoke === address) {
        setIsAuthorized(false);
      }
      
      if (nftId) {
        fetchAuthorizedAddresses(nftId);
      }
      
    } catch (error) {
      notification.remove(notificationId);
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
                      <Address address={addr as `0x${string}`} />
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
