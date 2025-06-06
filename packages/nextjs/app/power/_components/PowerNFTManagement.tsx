"use client";

import { useState, useEffect } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useScaffoldContract, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { getMetadataFromIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import axios from "axios";
import { Hash } from "viem";

interface NFTItem {
  id: number;
  uri: string;
  owner: string;
  isAccredited: boolean;
  name?: string;
  kind?: string;
  description?: string;
  image?: string;
  isAuctionActive?: boolean;
}

export const PowerNFTManagement = () => {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient(); // 用于获取交易详情
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 1;

  const { data: yourCollectibleContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startPrice, setStartPrice] = useState(0);
  const [selectedDateTime, setSelectedDateTime] = useState<string>("");

  // 获取用户的NFT总数（用于显示信息）
  useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "balanceOf",
    args: [connectedAddress],
    watch: true,
  });

  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const FETCH_COOLDOWN = 30000; // 30秒的冷却时间

  useEffect(() => {
    const fetchNFTs = async () => {
      if (!yourCollectibleContract || !connectedAddress) {
        console.log("合约或地址未就绪:", { contract: !!yourCollectibleContract, address: connectedAddress });
        return;
      }

      const now = Date.now();
      if (now - lastFetchTime < FETCH_COOLDOWN) {
        console.log("数据获取冷却中...");
        return;
      }

      try {
        console.log("开始获取授权的NFT列表...");
        const authorizedTokenIds = await yourCollectibleContract.read.getAuthorizedTokenIds([connectedAddress]);
        console.log("获取到的授权TokenID列表:", authorizedTokenIds);
        const nftItems: NFTItem[] = [];

        for (const tokenId of authorizedTokenIds) {
          try {
            const tokenURI = await yourCollectibleContract.read.tokenURI([tokenId]);
            const nftMetadata = await getMetadataFromIPFS(tokenURI);
            const auction = await yourCollectibleContract.read.getAuction([tokenId]);
            const nftItem = await yourCollectibleContract.read.getNftItem([tokenId]);

            nftItems.push({
              id: parseInt(tokenId.toString()),
              uri: tokenURI,
              owner: nftItem.seller,
              isAccredited: nftItem.isAccredited,
              ...nftMetadata,
              isAuctionActive: auction.isActive,
            });
          } catch (error) {
            console.error(`处理NFT ${tokenId.toString()}时出错:`, error);
          }
        }

        setNfts(nftItems);
        setLastFetchTime(now);
      } catch (error) {
        console.error("获取NFT列表失败:", error);
        setNfts([]);
      }
    };

    if (connectedAddress && yourCollectibleContract) {
      fetchNFTs();
    }
  }, [connectedAddress, yourCollectibleContract, lastFetchTime]);

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

  const handleToggleAccreditation = async (tokenId: number, currentStatus: boolean) => {
    const notificationId = notification.loading("正在更新鉴定状态...");
    try {
      // 记录NFT名称
      const nftItem = nfts.find(nft => nft.id === tokenId);
      const nftName = nftItem?.name || `拍品 #${tokenId}`;
      
      // 执行智能合约的方法
      const txHash = await writeContractAsync({
        functionName: "modiyAccredited",
        args: [BigInt(tokenId), !currentStatus],
      });
      
      if (!publicClient || !txHash) {
        notification.remove(notificationId);
        notification.error("获取交易信息失败");
        return;
      }
      
      // 获取交易收据
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: txHash as Hash
      });
      
      // 获取区块信息
      const block = await publicClient.getBlock({ 
        blockNumber: receipt.blockNumber 
      });
      
      // 构建操作描述
      const action = currentStatus ? "禁止鉴定" : "允许鉴定";
      const opDescription = `${action} - 拍品ID: ${tokenId}, 名称: ${nftName}`;
      
      // 将交易数据保存到数据库
      await saveTransactionToDatabase(
        receipt.blockNumber,
        block.timestamp,
        receipt.transactionHash,
        connectedAddress || '', // 发送者
        receipt.to || '', // 接收者（合约地址）
        receipt.gasUsed, // 使用的gas
        receipt.status, // 交易状态
        opDescription // 操作描述
      );
      
      notification.remove(notificationId);
      notification.success("鉴定状态更新成功！");
      setNfts(prev =>
        prev.map(nft =>
          nft.id === tokenId ? { ...nft, isAccredited: !currentStatus } : nft
        )
      );
    } catch (error) {
      notification.remove(notificationId);
      notification.error("鉴定状态更新失败！");
      console.error(error);
    }
  };

  const handleCreateAuction = async (tokenId: number) => {
    if (!startPrice || !selectedDateTime) {
      notification.error("请输入起拍价格和结束时间！");
      return;
    }

    const notificationId = notification.loading("正在创建拍卖...");
    try {
      const endTime = Math.floor(new Date(selectedDateTime).getTime() / 1000);
      console.log("结束时间戳:", endTime);
      
      // 记录NFT名称
      const nftItem = nfts.find(nft => nft.id === tokenId);
      const nftName = nftItem?.name || `拍品 #${tokenId}`;
      
      // 执行智能合约的方法
      const txHash = await writeContractAsync({
        functionName: "createAuction",
        args: [
          BigInt(tokenId),
          nfts.find(nft => nft.id === tokenId)?.uri || "",
          BigInt(startPrice * 10 ** 18),
          BigInt(endTime),
        ],
      });

      if (!publicClient || !txHash) {
        notification.remove(notificationId);
        notification.error("获取交易信息失败");
        return;
      }
      
      // 获取交易收据
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: txHash as Hash
      });
      
      // 获取区块信息
      const block = await publicClient.getBlock({ 
        blockNumber: receipt.blockNumber 
      });
      
      // 构建操作描述
      const opDescription = `创建拍卖 - 拍品ID: ${tokenId}, 名称: ${nftName}, 起拍价: ${startPrice} ETH, 结束时间: ${new Date(endTime * 1000).toLocaleString()}`;
      
      // 将交易数据保存到数据库
      await saveTransactionToDatabase(
        receipt.blockNumber,
        block.timestamp,
        receipt.transactionHash,
        connectedAddress || '', // 发送者
        receipt.to || '', // 接收者（合约地址）
        receipt.gasUsed, // 使用的gas
        receipt.status, // 交易状态
        opDescription // 操作描述
      );

      notification.remove(notificationId);
      notification.success("拍卖创建成功！");
      setIsModalOpen(false);
      
      // 更新NFT的拍卖状态
      setNfts(prev =>
        prev.map(nft =>
          nft.id === tokenId ? { ...nft, isAuctionActive: true } : nft
        )
      );
    } catch (error) {
      notification.remove(notificationId);
      notification.error("拍卖创建失败！");
      console.error(error);
    }
  };

  const handleEndAuction = async (tokenId: number) => {
    const notificationId = notification.loading("正在结束拍卖...");
    try {
      // 获取拍卖信息
      const auction = await yourCollectibleContract?.read.getAuction([BigInt(tokenId)]);
      if (!auction) {
        notification.remove(notificationId);
        notification.error("获取拍卖信息失败！");
        return;
      }

      // 检查拍卖是否已经结束
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime <= Number(auction.endTime)) {
        notification.remove(notificationId);
        notification.error("拍卖尚未结束，请等待拍卖结束时间到达后再试！");
        return;
      } else {
        console.log(currentTime, Number(auction.endTime));
      }

      // 记录NFT名称
      const nftItem = nfts.find(nft => nft.id === tokenId);
      const nftName = nftItem?.name || `拍品 #${tokenId}`;
      
      // 执行智能合约的方法
      const txHash = await writeContractAsync({
        functionName: "endAuction",
        args: [BigInt(tokenId.toString()), BigInt(currentTime)],
      });
      
      if (!publicClient || !txHash) {
        notification.remove(notificationId);
        notification.error("获取交易信息失败");
        return;
      }
      
      // 获取交易收据
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: txHash as Hash
      });
      
      // 获取区块信息
      const block = await publicClient.getBlock({ 
        blockNumber: receipt.blockNumber 
      });
      
      // 构建操作描述
      const highestBid = Number(auction.highestBid) / 10**18;
      const opDescription = `结束拍卖 - 拍品ID: ${tokenId}, 名称: ${nftName}, 最终价格: ${highestBid} ETH, 最高出价者: ${auction.highestBidder}`;
      
      // 将交易数据保存到数据库
      await saveTransactionToDatabase(
        receipt.blockNumber,
        block.timestamp,
        receipt.transactionHash,
        connectedAddress || '', // 发送者
        receipt.to || '', // 接收者（合约地址）
        receipt.gasUsed, // 使用的gas
        receipt.status, // 交易状态
        opDescription // 操作描述
      );
      
      notification.remove(notificationId);
      notification.success("拍卖成功结束！");
      // 更新NFT的拍卖状态
      setNfts(prev =>
        prev.map(nft =>
          nft.id === tokenId ? { ...nft, isAuctionActive: false } : nft
        )
      );
    } catch (error) {
      notification.remove(notificationId);
      notification.error("结束拍卖失败！");
      console.error(error);
    }
  };

  const paginatedNfts = nfts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(nfts.length / itemsPerPage);

  if (nfts.length === 0) {
    return (
      <div className="flex justify-center items-center mt-10">
        <div className="text-2xl text-primary-content">暂时没有被授权的NFT。</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center mt-8">
      <div className="w-full max-w-4xl">
        {paginatedNfts.map(nft => (
          <div key={nft.id} className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <h2 className="card-title">{nft.name}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p>ID: {nft.id}</p>
                  <p>种类: {nft.kind}</p>
                  <p>描述: {nft.description}</p>
                </div>
                <div className="flex justify-center">
                  {nft.image && (
                    <img
                      src={nft.image}
                      alt="NFT Image"
                      className="w-48 h-48 object-cover rounded-lg"
                    />
                  )}
                </div>
              </div>
              <div className="flex justify-between mt-4">
                <button
                  className="btn btn-secondary"
                  onClick={() => handleToggleAccreditation(nft.id, nft.isAccredited)}
                >
                  {nft.isAccredited ? "取消允许鉴定" : "允许鉴定"}
                </button>
                {nft.isAuctionActive ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleEndAuction(nft.id)}
                  >
                    结束拍卖
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={() => setIsModalOpen(true)}
                  >
                    创建拍卖
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center items-center mt-6">
        <button
          className="btn btn-secondary"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          上一页
        </button>
        <span className="mx-4">
          第 {currentPage} 页 / 共 {totalPages} 页
        </span>
        <button
          className="btn btn-secondary"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          下一页
        </button>
      </div>

      {/* 创建拍卖弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">创建拍卖</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-lg font-medium mb-2">起拍价 (ETH):</label>
                <input
                  type="number"
                  placeholder="请输入起拍价"
                  className="input input-bordered w-full"
                  onChange={e => setStartPrice(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-lg font-medium mb-2">结束时间:</label>
                <input
                  type="datetime-local"
                  className="input input-bordered w-full"
                  onChange={e => setSelectedDateTime(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-4">
                <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  取消
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const selectedNft = paginatedNfts.find(nft => !nft.isAuctionActive);
                    if (selectedNft) {
                      handleCreateAuction(selectedNft.id);
                    }
                  }}
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
