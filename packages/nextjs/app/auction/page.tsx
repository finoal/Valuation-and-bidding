"use client";

import { useEffect, useState } from "react";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldContract, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { usePublicClient, useAccount } from "wagmi";
import { useRouter } from "next/navigation"; // 页面跳转
import axios from "axios"; // 导入axios用于API调用
import { Hash } from "viem"; // 导入Hash类型
import { notification } from "~~/utils/scaffold-eth"; // 导入notification

export interface AuctionNFT {
  tokenId: number;
  uri: string;
  owner: string;
  currentBid: string;
  highestBidder: string;
  startingBid: string;
  bidCount: number;
  startTime: string;
  name?: string;
  description?: string;
  image?: string;
  countdown?: string; // 剩余时间倒计时
  accreditedCount?: number; // 鉴定次数
}

const PAGE_SIZE = 3; // 每页显示的拍卖数量

const AuctionPage = () => {
  const router = useRouter();
  const { address } = useAccount(); // 获取当前用户地址
  const [auctionNfts, setAuctionNfts] = useState<AuctionNFT[]>([]);
  const [filteredNfts, setFilteredNfts] = useState<AuctionNFT[]>([]); // 筛选后的拍卖数据
  const [currentPage, setCurrentPage] = useState(1); // 当前页码
  const [isLoading, setIsLoading] = useState(false);
  const [bidAmounts, setBidAmounts] = useState<{ [tokenId: number]: string }>({}); // 记录每个拍品的输入价格
  const [filterDescription, setFilterDescription] = useState(""); // 筛选描述
  const [filterPrice, setFilterPrice] = useState({ min: "", max: "" }); // 筛选价格范围
  const [sortType, setSortType] = useState<"latest" | "hottest" | "default">("default"); // 排序状态
  const publicClient = usePublicClient();
  const { data: ongoingAuctions } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getAllAuctions",
    watch: true,
  });

  const { data: yourCollectibleContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");

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

  // 获取 NFT 元数据
  const fetchNftDetails = async (tokenId: number, uri: string): Promise<AuctionNFT> => {
    try {
      const metadata = await getMetadataFromIPFS(uri);
      const accreditedCount = await yourCollectibleContract?.read.getAccreditedCount([BigInt(tokenId)]);
      console.log("accreditedCount:", accreditedCount);
      return {
        tokenId,
        uri,
        owner: "",
        currentBid: "0",
        highestBidder: "",
        startingBid: "0",
        bidCount: 0,
        startTime: "0",
        name: metadata.name || "未命名",
        description: metadata.description || "无描述",
        image: metadata.image || "",
        countdown: "加载中...",
        accreditedCount: Number(accreditedCount) || 0,
      };
    } catch (error) {
      console.error("获取 NFT 元数据失败:", error);
      return {} as AuctionNFT;
    }
  };

  // 从 IPFS 获取元数据
  const getMetadataFromIPFS = async (uri: string) => {
    try {
      const ipfsUrl = uri.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
      const response = await fetch(ipfsUrl);
      const metadata = await response.json();
      if (metadata.image) {
        metadata.image = metadata.image.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
      }
      return metadata;
    } catch (error) {
      console.error("IPFS 元数据获取失败:", error);
      return {};
    }
  };

  // 计算剩余时间
  const calculateCountdown = (endTime: number): string => {
    const currentTime = Math.floor(Date.now() / 1000);
    const remainingTime = endTime - currentTime;

    if (remainingTime <= 0) {
      return "已结束";
    }

    const hours = Math.floor(remainingTime / 3600);
    const minutes = Math.floor((remainingTime % 3600) / 60);
    const seconds = remainingTime % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // 排序函数
  const sortNfts = (nfts: AuctionNFT[], type: "latest" | "hottest" | "default") => {
    if (type === "latest") {
      return nfts.sort((a, b) => {
        const aStartTime = new Date(a.startTime).getTime();
        const bStartTime = new Date(b.startTime).getTime();
        return bStartTime - aStartTime;
      });
    } else if (type === "hottest") {
      return nfts.sort((a, b) => b.bidCount - a.bidCount);
    }
    return nfts;
  };

  // 启动倒计时并检测结束状态
  const updateCountdownAndEndAuction = (endTime: number, tokenId: number) => {
    const intervalId = setInterval(() => {
      setAuctionNfts(prev => {
        const updatedNfts = prev.map(nft => {
          if (nft.tokenId === tokenId) {
            const countdown = calculateCountdown(endTime);

            if (countdown === "已结束") {
              clearInterval(intervalId);
              alert(`拍卖 ${tokenId} 已结束！`);
            }

            return { ...nft, countdown };
          }
          return nft;
        });

        // 使用最新的 sortType 进行排序
        return sortNfts(updatedNfts, sortType);
      });
    }, 1000); // 每秒更新一次

    return intervalId;
  };

  // 加载拍卖数据
  useEffect(() => {
    const fetchAuctionNfts = async () => {
      if (!ongoingAuctions) return;
      setIsLoading(true);

      const nftData: AuctionNFT[] = [];
      for (const auction of ongoingAuctions) {
        try {
          const endTime = Number(auction.endTime.toString());
          if (endTime <= Math.floor(Date.now() / 1000)) continue;

          const tokenId = Number(auction.tokenId);
          const uri = auction.uri;
          const nftDetails = await fetchNftDetails(tokenId, uri);

          nftDetails.owner = auction.seller;
          nftDetails.currentBid = auction.highestBid.toString();
          nftDetails.highestBidder = auction.highestBidder;
          nftDetails.startingBid = auction.startPrice.toString();
          nftDetails.bidCount = Number(auction.bidCount);
          nftDetails.startTime = new Date(Number(auction.startTime.toString()) * 1000).toLocaleString();
          nftDetails.countdown = calculateCountdown(endTime);
          nftData.push(nftDetails);

          updateCountdownAndEndAuction(endTime, tokenId); // 启动倒计时并监测拍卖结束
        } catch (error) {
          console.error("加载拍卖数据失败:", error);
        }
      }

      // 根据当前排序状态对数据进行排序
      const sortedNfts = sortNfts(nftData, sortType);
      setAuctionNfts(sortedNfts);
      setFilteredNfts(sortedNfts);
      setIsLoading(false);
    };

    fetchAuctionNfts();
  }, [ongoingAuctions, sortType]);

  // 筛选拍卖
  useEffect(() => {
    const filtered = auctionNfts.filter(nft => {
      const matchesDescription = nft.description?.includes(filterDescription);
      const matchesPrice =
        (!filterPrice.min || Number(nft.currentBid) / 1e18 >= Number(filterPrice.min)) &&
        (!filterPrice.max || Number(nft.currentBid) / 1e18 <= Number(filterPrice.max));
      return matchesDescription && matchesPrice;
    });

    // 根据当前排序状态对筛选后的数据进行排序
    const sortedFilteredNfts = sortNfts(filtered, sortType);
    setFilteredNfts(sortedFilteredNfts);
    setCurrentPage(1); // 筛选后回到第一页
  }, [filterDescription, filterPrice, auctionNfts, sortType]);

  // 处理排序
  const handleSort = (type: "latest" | "hottest") => {
    setSortType(type);
    const sortedNfts = sortNfts([...auctionNfts], type);
    setFilteredNfts(sortedNfts);
    setCurrentPage(1); // 排序后回到第一页
  };

  // 处理出价
  const handleBid = async (tokenId: number) => {
    const bidValue = bidAmounts[tokenId]; // 获取当前拍品的出价
    if (!bidValue || isNaN(Number(bidValue)) || Number(bidValue) <= 0) {
      alert("请输入有效的出价金额！");
      return;
    }
    
    // 获取NFT信息用于描述
    const nft = auctionNfts.find(item => item.tokenId === tokenId);
    if (!nft) {
      alert("找不到拍品信息！");
      return;
    }
    
    const notificationId = notification.loading("正在提交竞价...");
    
    try {
      const inputBid = Number(bidValue) * 10 ** 18;
      const txHash = await writeContractAsync({
        functionName: "placeBid",
        args: [BigInt(tokenId)],
        value: BigInt(inputBid),
      });
      
      if (!publicClient || !txHash) {
        notification.remove(notificationId);
        alert("获取交易信息失败");
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
      
      // 将交易数据保存到数据库
      await saveTransactionToDatabase(
        receipt.blockNumber,
        block.timestamp,
        receipt.transactionHash,
        address || '', // 发送者
        receipt.to || '', // 接收者（合约地址）
        receipt.gasUsed, // 使用的gas
        receipt.status, // 交易状态
        `参与竞价 - 拍品ID: ${tokenId}, 名称: ${nft.name}, 出价金额: ${bidValue} ETH` // 操作描述
      );
      
      notification.remove(notificationId);
      notification.success("出价成功！但请关注拍品动向，可能有其他用户出价更高。");
      
      setBidAmounts(prev => ({ ...prev, [tokenId]: "" })); // 清空当前拍品的输入框
    } catch (error) {
      notification.remove(notificationId);
      console.error("出价失败:", error);
      notification.error("出价失败，请检查您的输入或钱包余额。");
    }
  };

  // 封装跳转逻辑
  const handleNavigateToDetail = (nft: AuctionNFT) => {
    console.log(`NFT 选中, Token ID: ${nft.tokenId}`);
    localStorage.setItem("selectedNft", JSON.stringify(nft));
    router.push(`/nftMessage`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center mt-10">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // 分页数据
  const paginatedNfts = filteredNfts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="container mx-auto">
      <header className="my-4 flex justify-between items-center">
        <h1 className="text-3xl font-bold">拍卖市场</h1>
        <div className="flex space-x-2">
          <button
            className="btn btn-outline btn-primary"
            onClick={() => handleSort("latest")}
          >
            最新
          </button>
          <button
            className="btn btn-outline btn-primary"
            onClick={() => handleSort("hottest")}
          >
            最热
          </button>
        </div>
      </header>
      {/* 筛选功能 */}
      <div className="flex flex-col sm:flex-row justify-between mb-6">
        <input
          type="text"
          className="input input-bordered w-full sm:w-1/3 mb-4 sm:mb-0"
          placeholder="筛选描述"
          value={filterDescription}
          onChange={e => setFilterDescription(e.target.value)}
        />
        <div className="flex space-x-2">
          <input
            type="number"
            className="input input-bordered w-1/2"
            placeholder="最低价格 (ETH)"
            value={filterPrice.min}
            onChange={e => setFilterPrice({ ...filterPrice, min: e.target.value })}
          />
          <input
            type="number"
            className="input input-bordered w-1/2"
            placeholder="最高价格 (ETH)"
            value={filterPrice.max}
            onChange={e => setFilterPrice({ ...filterPrice, max: e.target.value })}
          />
        </div>
      </div>
      {filteredNfts.length === 0 ? (
        <div className="flex justify-center items-center mt-10">
          <div className="text-2xl text-primary-content">暂无符合条件的拍卖</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedNfts.map(nft => (
              <div
                key={nft.tokenId}
                className="card card-compact bg-base-100 shadow-lg rounded-xl overflow-hidden"
              >
                <div className="cursor-pointer" onClick={() => handleNavigateToDetail(nft)}>
                  <figure>
                    <img
                      src={nft.image}
                      alt="NFT Image"
                      className="w-full h-64 object-cover"
                    />
                  </figure>
                </div>
                <div className="card-body space-y-3">
                  <h2 className="card-title text-xl">{nft.name}</h2>
                  <p>{nft.description}</p>
                  <div className="flex justify-between">
                    <span>起拍价:</span>
                    <span>{Number(nft.startingBid) / 1e18} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span>开始时间:</span>
                    <span>{nft.startTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>当前出价:</span>
                    <span>{Number(nft.currentBid) / 1e18} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span>最高出价者:</span>
                    <Address address={nft.highestBidder} />
                  </div>
                  <div className="flex justify-between">
                    <span>鉴定次数:</span>
                    <span>{Number(nft.accreditedCount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>竞拍次数:</span>
                    <span>{nft.bidCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>剩余时间:</span>
                    <span>{nft.countdown}</span>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <input
                      type="number"
                      className="input input-bordered w-full"
                      placeholder="输入出价 (ETH)"
                      value={bidAmounts[nft.tokenId] || ""} // 绑定独立的出价值
                      onChange={e =>
                        setBidAmounts(prev => ({
                          ...prev,
                          [nft.tokenId]: e.target.value,
                        }))
                      }
                    />
                    <button
                      className="btn btn-primary"
                      onClick={() => handleBid(nft.tokenId)}
                    >
                      出价
                    </button>
                  </div>
                  <button
                    className="btn btn-secondary mt-2"
                    onClick={() => handleNavigateToDetail(nft)}
                  >
                    查看详情
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* 分页导航 */}
          <div className="flex justify-center items-center mt-6 space-x-4">
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              上一页
            </button>
            <span>第 {currentPage} 页 / 共 {Math.ceil(filteredNfts.length / PAGE_SIZE)} 页</span>
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredNfts.length / PAGE_SIZE)))}
              disabled={currentPage === Math.ceil(filteredNfts.length / PAGE_SIZE)}
            >
              下一页
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AuctionPage;
