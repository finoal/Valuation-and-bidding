"use client";

import { useEffect, useState } from "react";
import { NFTCard } from "./NFTCard";
import { useAccount } from "wagmi";
import { useScaffoldContract, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { getMetadataFromIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import { NFTMetaData } from "~~/utils/simpleNFT/nftsMetadata";

interface Auction {
  tokenId: bigint;
  uri: string;
  seller: string;
  startPrice: bigint;
  highestBid: bigint;
  highestBidder: string;
  endTime: bigint;
  isActive: boolean;
  isroyalty: boolean;
  num: bigint;
  bidCount: bigint;
  bidders: readonly string[];
  startTime: bigint;
}

export interface Collectible extends Partial<NFTMetaData> {
  id: number;
  uri: string;
  owner: string;
  isAccredited: boolean;
  auction?: Auction;
  // transactionRecords?: {
  //   transactionId: string;
  //   timestamp: string;
  //   price: string;
  //   from: string;
  //   to: string;
  // }[];
}

export const MyHoldings = () => {
  const { address: connectedAddress } = useAccount();
  const [myAllCollectibles, setMyAllCollectibles] = useState<Collectible[]>([]);
  const [filteredCollectibles, setFilteredCollectibles] = useState<Collectible[]>([]);
  const [allCollectiblesLoading, setAllCollectiblesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>(""); // 搜索框输入
  const [currentPage, setCurrentPage] = useState<number>(1); // 当前页码
  const itemsPerPage = 3; // 每页显示数量
  const [checkedExpiredAuctions, setCheckedExpiredAuctions] = useState(false); // 是否已检查过期拍卖

  const { data: yourCollectibleContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  const { data: myTotalBalance } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "balanceOf",
    args: [connectedAddress],
    watch: true,
  });

  const updateCollectible = (updatedNft: Collectible) => {
    setMyAllCollectibles(prevCollectibles =>
      prevCollectibles.map(nft => (nft.id === updatedNft.id ? { ...nft, isAccredited: updatedNft.isAccredited } : nft)),
    );
    // 重新设置filteredCollectibles以触发重新渲染
    setFilteredCollectibles(prevFilteredCollectibles =>
      prevFilteredCollectibles.map(nft =>
        nft.id === updatedNft.id ? { ...nft, isAccredited: updatedNft.isAccredited } : nft,
      ),
    );
  };

  const checkExpiredAuctions = () => {
    if (!myAllCollectibles.length || checkedExpiredAuctions) return;
    
    const currentTime = Math.floor(Date.now() / 1000);
    let expiredAuctionsFound = false;
    
    myAllCollectibles.forEach(collectible => {
      if (collectible.auction && collectible.auction.isActive) {
        const endTime = Number(collectible.auction.endTime);
        if (currentTime >= endTime) {
          // 使用自定义事件发送消息，而不是直接显示通知
          const message = `拍品 #${collectible.id} "${collectible.name}" 的拍卖已到达结束时间，可以结束拍卖了。`;
          
          // 创建并触发自定义事件
          const event = new CustomEvent('addSystemMessage', {
            detail: { message }
          });
          window.dispatchEvent(event);
          
          expiredAuctionsFound = true;
        }
      }
    });
    
    if (!expiredAuctionsFound) {
      // 如果没有过期拍卖，记录状态避免反复检查
      setCheckedExpiredAuctions(true);
    }
  };

  useEffect(() => {
    const updateMyCollectibles = async (): Promise<void> => {
      if (!myTotalBalance || !yourCollectibleContract || !connectedAddress) return;

      setAllCollectiblesLoading(true);
      const collectibleUpdate: Collectible[] = [];
      const totalBalance = parseInt(myTotalBalance.toString());

      for (let tokenIndex = 0; tokenIndex < totalBalance; tokenIndex++) {
        try {
          const tokenId = await yourCollectibleContract.read.tokenOfOwnerByIndex([
            connectedAddress,
            BigInt(tokenIndex),
          ]);
          //获取图片uri
          const tokenURI = await yourCollectibleContract.read.tokenURI([tokenId]);
          const nftMetadata: NFTMetaData = await getMetadataFromIPFS(tokenURI as string);
          const nftitem = await yourCollectibleContract.read.getNftItem([tokenId]);
          
          // 获取拍卖信息
          const auctionInfo = await yourCollectibleContract.read.getAuction([tokenId]);
          
          collectibleUpdate.push({
            id: parseInt(tokenId.toString()),
            uri: tokenURI,
            owner: connectedAddress,
            isAccredited: nftitem.isAccredited,
            auction: auctionInfo, // 添加拍卖信息
            ...nftMetadata,
          });
        } catch (e) {
          console.error(e);
        }
      }
      collectibleUpdate.sort((a, b) => a.id - b.id);
      setMyAllCollectibles(collectibleUpdate);
      setFilteredCollectibles(collectibleUpdate); // 初始化筛选结果
      setAllCollectiblesLoading(false);
      setCheckedExpiredAuctions(false); // 重置检查标志
    };

    updateMyCollectibles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedAddress, myTotalBalance]);

  useEffect(() => {
    if (myAllCollectibles.length > 0 && !checkedExpiredAuctions) {
      checkExpiredAuctions();
    }
  }, [myAllCollectibles, checkedExpiredAuctions]);

  useEffect(() => {
    // 避免不必要的状态更新
    const filtered = myAllCollectibles.filter(item =>
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kind?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toString().includes(searchQuery)
    );

    if (JSON.stringify(filtered) !== JSON.stringify(filteredCollectibles)) {
      setFilteredCollectibles(filtered);
      setCurrentPage(1); // 每次筛选时重置到第一页
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const paginatedCollectibles = filteredCollectibles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredCollectibles.length / itemsPerPage);

  const goToFirstPage = () => {
    setCurrentPage(1);
  };

  const goToLastPage = () => {
    setCurrentPage(totalPages);
  };

  if (allCollectiblesLoading)
    return (
      <div className="flex justify-center items-center mt-10">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );

  return (
    <>
      <div className="flex justify-center mb-4">
        <input
          type="text"
          placeholder="筛选种类、名称或ID"
          className="input input-bordered w-1/2"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>
      {paginatedCollectibles.length === 0 ? (
        <div className="flex justify-center items-center mt-10">
          <div className="text-2xl text-primary-content">未找到匹配的藏品。</div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 my-8 px-5 justify-center">
          {paginatedCollectibles.map(item => (
            <div key={item.id} className="flex flex-col items-center">
              <NFTCard nft={item} updateCollectible={updateCollectible} />
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-center items-center mt-6 gap-2">
        <button
          className="btn btn-secondary"
          disabled={currentPage === 1}
          onClick={goToFirstPage}
        >
          首页
        </button>
        <button
          className="btn btn-secondary"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          上一页
        </button>
        <span className="mx-4">
          第 {currentPage} 页 / 共 {Math.max(totalPages, 1)} 页
        </span>
        <button
          className="btn btn-secondary"
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          下一页
        </button>
        <button
          className="btn btn-secondary"
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={goToLastPage}
        >
          尾页
        </button>
      </div>
    </>
  );
};
