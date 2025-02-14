"use client";

import { useEffect, useState } from "react";
import { NFTCard } from "./NFTCard";
import { useScaffoldContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { getMetadataFromIPFS } from "~~/utils/simpleNFT/ipfs-fetch";

export interface Collectible {
  id: number; // NFT的唯一标识
  uri: string; // NFT的元数据URI
  owner: string; // 所有者地址
  isAccredited: boolean; // 是否允许被鉴定
  accreditedCount: number; // 鉴定次数
  name?: string; // NFT的名称
  kind?: string; // NFT的类型
  description?: string; // NFT的描述
  image?: string; // NFT的图片URI
  tokenId?: number; // NFT的tokenId
}

export const MyHoldings = () => {
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasFetched, setHasFetched] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [filter, setFilter] = useState<string>("");
  const itemsPerPage = 3; // 每页显示的NFT数量

  const { data: yourCollectibleContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  useEffect(() => {
    if (!yourCollectibleContract || hasFetched) return;

    const fetchAccreditableNFTs = async () => {
      setLoading(true);
      try {
        // 调用合约方法获取可鉴定的NFT
        const nftItems = await yourCollectibleContract.read.getAccreditableNFTs();
        const collectiblesData: Collectible[] = await Promise.all(
          nftItems.map(async (nft: any) => {
            console.log("mft信息:", nft);
            const metadata = await getMetadataFromIPFS(nft.tokenUri);
            return {
              id: parseInt(nft.tokenId.toString()),
              uri: nft.tokenUri,
              owner: nft.seller,
              isAccredited: nft.isAccredited,
              accreditedCount: nft.accreditedCount,
              ...metadata,
              tokenId: parseInt(nft.tokenId.toString()),
            };
          }),
        );

        setCollectibles(collectiblesData);
        setHasFetched(true); // 标记已完成数据获取
      } catch (error) {
        notification.error("无法获取可鉴定的NFT列表！");
        console.error("Error fetching accreditable NFTs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccreditableNFTs();

    // Cleanup to avoid memory leaks
    return () => setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yourCollectibleContract]);

  // 筛选逻辑
  const filteredCollectibles = collectibles.filter((collectible) => {
    if (!filter) return true;
    const nameMatch = collectible.name?.includes(filter);
    const descriptionMatch = collectible.description?.includes(filter);
    return nameMatch || descriptionMatch;
  });

  // 分页逻辑
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCollectibles = filteredCollectibles.slice(startIndex, endIndex);


  if (loading)
    return (
      <div className="flex justify-center items-center mt-10">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 to-green-500 p-8">
      <h1 className="text-4xl font-bold text-center text-white mb-8">可鉴定藏品展示</h1>
      <div className="flex justify-center items-center mb-4">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="输入筛选关键词"
          className="input input-bordered input-primary w-full max-w-xs"
        />
      </div>
      {paginatedCollectibles.length === 0? (
        <div className="flex justify-center items-center">
          <p className="text-2xl text-white">暂无可鉴定的藏品。</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 my-8 px-5 justify-center">
          {paginatedCollectibles.map((nft) => (
            <NFTCard key={nft.id} nft={nft} updateCollectible={() => {}} />
          ))}
        </div>
      )}
      <div className="flex justify-center items-center mt-4">
        <button
          onClick={() => setCurrentPage(prevPage => Math.max(prevPage - 1, 1))}
          disabled={currentPage === 1}
          className="btn btn-primary mr-2"
        >
          上一页
        </button>
        <button
          onClick={() => setCurrentPage(prevPage => prevPage + 1)}
          className="btn btn-primary"
        >
          下一页
        </button>
      </div>
    </div>
  );
};