"use client";

import { useEffect, useState, useRef } from "react";
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

// 倒计时显示组件
const CountdownDisplay = ({ endTime }: { endTime: number }) => {
  const [countdown, setCountdown] = useState<string>("加载中...");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 立即计算一次倒计时
    updateCountdown();
    
    // 设置计时器每秒更新一次
    timerRef.current = setInterval(updateCountdown, 1000);
    
    // 清理函数
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [endTime]);
  
  // 更新倒计时的函数
  const updateCountdown = () => {
    const currentTime = Math.floor(Date.now() / 1000);
    const remainingTime = endTime - currentTime;
    
    if (remainingTime <= 0) {
      setCountdown("已结束");
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }
    
    const hours = Math.floor(remainingTime / 3600);
    const minutes = Math.floor((remainingTime % 3600) / 60);
    const seconds = remainingTime % 60;
    
    setCountdown(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
  };
  
  return <span>{countdown}</span>;
};

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
    // 深拷贝数组，避免排序影响原始数据
    const nftsCopy = [...nfts];
    
    if (type === "latest") {
      return nftsCopy.sort((a, b) => {
        const aStartTime = new Date(a.startTime).getTime();
        const bStartTime = new Date(b.startTime).getTime();
        return bStartTime - aStartTime;
      });
    } else if (type === "hottest") {
      return nftsCopy.sort((a, b) => b.bidCount - a.bidCount);
    }
    return nftsCopy;
  };

  // 启动倒计时并检测结束状态 - 简化此函数，只保留拍卖结束检测
  const checkAuctionEnded = (endTime: number, tokenId: number) => {
    // 每5秒检查一次拍卖是否结束
    const intervalId = setInterval(() => {
      const currentTime = Math.floor(Date.now() / 1000);
      if (endTime <= currentTime) {
        clearInterval(intervalId);
        alert(`拍卖 ${tokenId} 已结束！`);
      }
    }, 5000);
    
    return intervalId;
  };

  // 加载拍卖数据 - 简化此函数
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
          nftDetails.countdown = calculateCountdown(endTime); // 初始倒计时，仅用于数据显示
          nftData.push(nftDetails);

          // 设置检查拍卖结束的定时器
          checkAuctionEnded(endTime, tokenId);
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
    // 只有在筛选条件实际改变时才执行筛选
    const filtered = auctionNfts.filter(nft => {
      const matchesDescription = !filterDescription || (nft.description?.includes(filterDescription) ?? true);
      const matchesPrice =
        (!filterPrice.min || Number(nft.currentBid) / 1e18 >= Number(filterPrice.min)) &&
        (!filterPrice.max || Number(nft.currentBid) / 1e18 <= Number(filterPrice.max));
      return matchesDescription && matchesPrice;
    });

    // 根据当前排序状态对筛选后的数据进行排序
    const sortedFilteredNfts = sortNfts(filtered, sortType);
    
    // 将排序后的NFT与当前的filteredNfts合并，保留倒计时状态
    const mergedNfts = sortedFilteredNfts.map(newNft => {
      // 查找当前filteredNfts中相同tokenId的NFT
      const existingNft = filteredNfts.find(n => n.tokenId === newNft.tokenId);
      // 如果找到，保留其倒计时状态
      if (existingNft) {
        return { ...newNft, countdown: existingNft.countdown };
      }
      return newNft;
    });
    
    // 检查是否与现有筛选结果不同，避免不必要的状态更新
    const currentFilteredJSON = JSON.stringify(filteredNfts.map(nft => nft.tokenId));
    const newFilteredJSON = JSON.stringify(mergedNfts.map(nft => nft.tokenId));
    
    if (currentFilteredJSON !== newFilteredJSON) {
      setFilteredNfts(mergedNfts);
      
      // 只有在用户手动更改筛选条件时才重置页码
      // 通过检测变化源来决定是否重置页码
      const isManualFilterChange = 
        !localStorage.getItem("isRestoringState") && 
        (localStorage.getItem("lastFilterDescription") !== filterDescription ||
         localStorage.getItem("lastFilterPriceMin") !== filterPrice.min ||
         localStorage.getItem("lastFilterPriceMax") !== filterPrice.max);
      
      if (isManualFilterChange) {
        setCurrentPage(1); // 只在手动筛选条件变化时重置页码
      }
      
      // 更新上次的筛选条件记录
      localStorage.setItem("lastFilterDescription", filterDescription);
      localStorage.setItem("lastFilterPriceMin", filterPrice.min);
      localStorage.setItem("lastFilterPriceMax", filterPrice.max);
    }
  }, [filterDescription, filterPrice, auctionNfts, sortType, filteredNfts]);

  // 处理排序
  const handleSort = (type: "latest" | "hottest") => {
    setSortType(type);
    // 排序处理已经在useEffect中处理，这里不再重复执行
    // 标记为手动操作
    localStorage.setItem("isManualSortChange", "true");
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
    // 保存NFT数据和当前页面状态到localStorage
    localStorage.setItem("selectedNft", JSON.stringify(nft));
    localStorage.setItem("auctionPageState", JSON.stringify({
      currentPage,
      filterDescription,
      filterPrice,
      sortType
    }));
    router.push(`/nftMessage`);
  };

  // 首页加载时恢复页面状态
  useEffect(() => {
    // 标记为正在恢复状态，避免触发筛选条件变化导致页码重置
    localStorage.setItem("isRestoringState", "true");
    
    const savedState = localStorage.getItem("auctionPageState");
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        // 首先设置筛选条件和排序，这样filteredNfts会先更新
        setFilterDescription(state.filterDescription || "");
        setFilterPrice(state.filterPrice || { min: "", max: "" });
        setSortType(state.sortType || "default");
        
        // 设置上次筛选条件记录
        localStorage.setItem("lastFilterDescription", state.filterDescription || "");
        localStorage.setItem("lastFilterPriceMin", state.filterPrice?.min || "");
        localStorage.setItem("lastFilterPriceMax", state.filterPrice?.max || "");
        
        // 延迟设置页码，确保筛选结果先更新完成
        setTimeout(() => {
          setCurrentPage(state.currentPage || 1);
          // 恢复完成后移除标记
          localStorage.removeItem("isRestoringState");
          localStorage.removeItem("isManualSortChange");
        }, 100);
      } catch (error) {
        console.error("恢复页面状态失败:", error);
        localStorage.removeItem("isRestoringState");
      }
    } else {
      localStorage.removeItem("isRestoringState");
    }
  }, []);

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

  const totalPages = Math.ceil(filteredNfts.length / PAGE_SIZE);

  // 分页功能
  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };

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
                    <Address address={nft.highestBidder as `0x${string}`} />
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
                    <CountdownDisplay 
                      endTime={ongoingAuctions?.find(a => Number(a.tokenId) === nft.tokenId)?.endTime ? 
                        Number(ongoingAuctions.find(a => Number(a.tokenId) === nft.tokenId)?.endTime) : 0} 
                    />
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
          <div className="flex justify-center items-center mt-6 space-x-2">
            <button
              className="btn btn-secondary"
              onClick={goToFirstPage}
              disabled={currentPage === 1}
            >
              首页
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              上一页
            </button>
            <span className="px-4">第 {currentPage} 页 / 共 {totalPages} 页</span>
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              下一页
            </button>
            <button
              className="btn btn-secondary"
              onClick={goToLastPage}
              disabled={currentPage === totalPages}
            >
              尾页
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AuctionPage;
