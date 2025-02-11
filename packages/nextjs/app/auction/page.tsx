"use client";

import { useEffect, useState } from "react";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldContract, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { usePublicClient } from "wagmi";
import { useRouter } from "next/navigation"; //页面跳转
import NFTMessage from "../nftMessage/page"; // **导入 NFT 详情页组件**
export interface AuctionNFT {
  tokenId: number;
  uri: string;
  owner: string;
  currentBid: string;
  highestBidder: string;
  startingBid: string;
  bidCount: number;
  name?: string;
  description?: string;
  image?: string;
  countdown?: string; // 剩余时间倒计时
  accreditedCount?: number; // 鉴定次数
}

const PAGE_SIZE = 3; // 每页显示的拍卖数量

const AuctionPage = () => {
  const router = useRouter();
  const [auctionNfts, setAuctionNfts] = useState<AuctionNFT[]>([]);
  const [filteredNfts, setFilteredNfts] = useState<AuctionNFT[]>([]); // 筛选后的拍卖数据
  const [currentPage, setCurrentPage] = useState(1); // 当前页码
  const [isLoading, setIsLoading] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null); // 存储选中的 NFT ID
  const [filterDescription, setFilterDescription] = useState(""); // 筛选描述
  const [filterPrice, setFilterPrice] = useState({ min: "", max: "" }); // 筛选价格范围
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

  // 获取 NFT 元数据
  const fetchNftDetails = async (tokenId: number, uri: string): Promise<AuctionNFT> => {
    try {
      const metadata = await getMetadataFromIPFS(uri);
      const accreditedCount = await yourCollectibleContract?.read.getAccreditedCount([BigInt(tokenId)]);
      console.log("accreditedCount:", accreditedCount);
      // 获取鉴定次数
      return {
        tokenId,
        uri,
        owner: "",
        currentBid: "0",
        highestBidder: "",
        startingBid: "0",
        bidCount: 0, //竞价次数
        name: metadata.name || "未命名",
        description: metadata.description || "无描述",
        image: metadata.image || "",
        countdown: "加载中...",
        accreditedCount: Number(accreditedCount), // 添加鉴定次数
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

  // 启动倒计时并检测结束状态
  const updateCountdownAndEndAuction = (endTime: number, tokenId: number) => {
    const intervalId = setInterval(() => {
      setAuctionNfts(prev =>
        prev.map(nft => {
          if (nft.tokenId === tokenId) {
            const countdown = calculateCountdown(endTime);

            // 如果倒计时已结束，调用合约的 endAuction 方法
            if (countdown === "已结束") {
              clearInterval(intervalId); // 停止定时器
              alert(`拍卖 ${tokenId} 已结束！`);
              //handleEndAuction(tokenId); // 调用合约方法结束拍卖
            }

            return { ...nft, countdown };
          }
          return nft;
        }),
      );
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
          nftDetails.countdown = calculateCountdown(endTime);
          console.log("111", auction.bidCount);
          nftData.push(nftDetails);

          updateCountdownAndEndAuction(endTime, tokenId); // 启动倒计时并监测拍卖结束
        } catch (error) {
          console.error("加载拍卖数据失败:", error);
        }
      }

      setAuctionNfts(nftData.sort((a, b) => a.tokenId - b.tokenId));
      setFilteredNfts(nftData);
      setIsLoading(false);
    };

    fetchAuctionNfts();
  }, [ongoingAuctions]);

  // 筛选拍卖
  useEffect(() => {
    const filtered = auctionNfts.filter(nft => {
      const matchesDescription = nft.description?.includes(filterDescription);
      const matchesPrice =
        (!filterPrice.min || Number(nft.currentBid) / 1e18 >= Number(filterPrice.min)) &&
        (!filterPrice.max || Number(nft.currentBid) / 1e18 <= Number(filterPrice.max));
      return matchesDescription && matchesPrice;
    });
    setFilteredNfts(filtered);
    setCurrentPage(1); // 筛选后回到第一页
  }, [filterDescription, filterPrice, auctionNfts]);

  // 分页数据
  const paginatedNfts = filteredNfts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // 调用合约方法结束拍卖
  // const handleEndAuction = async (tokenId: number) => {
  //   try {
  //     await writeContractAsync({
  //       functionName: "endAuction",
  //       args: [BigInt(tokenId)],
  //     });
  //     alert(`拍卖 ${tokenId} 已结束！`);
  //   } catch (error) {
  //     console.error(`结束拍卖失败 (Token ID: ${tokenId}):`, error);
  //   }
  // };

  // 处理出价
  const handleBid = async (tokenId: number) => {
    try {
      const inputBid = Number(bidAmount) * 10 ** 18;
      const tx = await writeContractAsync({
        functionName: "placeBid",
        args: [BigInt(tokenId)],
        value: BigInt(inputBid),
      });
      console.log(tx);
      const receipt = await publicClient?.getTransactionReceipt({ hash: tx as `0x${string}` });
      console.log(receipt);
      alert("出价成功！");
      setBidAmount("");
    } catch (error) {
      console.error("出价失败:", error);
      alert("出价失败，请检查您的输入或钱包余额。");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center mt-10">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }
  // 封装跳转逻辑，不使用 URL 传参
  const handleNavigateToDetail = (tokenId: number) => {
    setSelectedTokenId(tokenId); // 存储 tokenId
    console.log(`NFT 选中,Token ID: ${tokenId}`);
    console.log(selectedTokenId);
    router.push(`/nftMessage`);
  };

  return (
    <div className="container mx-auto">
      <header className="my-4">
        <h1 className="text-3xl font-bold text-center">拍卖市场</h1>
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
                 <div className="cursor-pointer" onClick={() => handleNavigateToDetail(nft.tokenId)}>
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
                      value={bidAmount}
                      onChange={e => setBidAmount(e.target.value)}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={() => handleBid(nft.tokenId)}
                    >
                      出价
                    </button>
                  </div>
                  {/* 查看详情按钮 */}
                  <button
                    className="btn btn-secondary mt-2"
                    onClick={() => router.push(`/nft-details?tokenId=${nft.tokenId}`)}
                  >
                    查看详情
                  </button>
                  {/* <button
                    className="btn btn-secondary mt-2"
                    onClick={() => handleEndAuction(nft.tokenId)}
                  >
                    手动结束拍卖
                  </button> */}
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
