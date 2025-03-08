"use client";

import { useState, useEffect } from "react";
import { Collectible } from "./MyHoldings";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { ethers } from "ethers";
import { useAccount } from "wagmi"; // 导入 wagmi 的 useAccount

export const NFTCard = ({ nft }: { nft: Collectible }) => {
  const [isOwner, setIsOwner] = useState(false); // 是否为当前地址的所有者
  const { address: currentAddress } = useAccount(); // 获取当前钱包地址
  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");

  // 检查是否是当前用户的钱包地址
  useEffect(() => {
    if (currentAddress && nft.owner) {
      setIsOwner(currentAddress.toLowerCase() === nft.owner.toLowerCase());
    }
  }, [currentAddress, nft.owner]);

  const handlePurchaseNft = async () => {
    try {
      const notificationId = notification.loading("Purchasing NFT");
      const tx = await writeContractAsync({
        functionName: "purchaseNft",
        args: [BigInt(nft.id)],
        value: nft.price,
      });
      notification.success("NFT purchased successfully!");
      console.log("Transaction:", tx);
      notification.remove(notificationId);
    } catch (error) {
      notification.error("Failed to purchase NFT");
      console.error(error);
    }
  };

  const handleUnlistNft = async () => {
    try {
      const notificationId = notification.loading("Unlisting NFT...");
      const tx = await writeContractAsync({
        functionName: "unlistNft",
        args: [BigInt(nft.id)],
      });
      notification.success("NFT unlisted successfully!");
      console.log("Transaction:", tx);
      notification.remove(notificationId);
    } catch (error) {
      notification.error("Failed to unlist NFT");
      console.error(error);
    }
  };

  return (
    <div className="card card-compact bg-base-100 shadow-lg w-[300px] h-[550px] shadow-secondary hover:shadow-xl transition-shadow duration-300">
      <figure className="relative h-[180px] w-full overflow-hidden">
        <img src={nft.image} alt="NFT Image" className="w-full h-full object-cover object-center" />
        <figcaption className="glass absolute bottom-4 left-4 p-4 rounded-xl backdrop-blur-sm">
          <span className="text-white font-semibold"># {nft.id}</span>
        </figcaption>
      </figure>
      <div className="card-body flex flex-col h-[370px] p-4">
        <div className="flex-grow space-y-2">
          <div className="flex items-start">
            <p className="text-xl p-0 m-0 font-semibold truncate w-full">{nft.name}</p>
          </div>
          <div className="flex flex-wrap space-x-2 mt-1">
            {nft.attributes?.map((attr, index) => (
              <span key={index} className="badge badge-primary py-3">
                {attr.value}
              </span>
            ))}
          </div>
          <div className="flex items-start">
            <p className="text-xl p-0 m-0 font-semibold break-words line-clamp-3">{nft.description}</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg font-semibold">所有人 : </span>
            <Address address={nft.owner} />
          </div>
          <div className="flex items-start">
            <span className="text-lg font-semibold">价格: {ethers.formatEther(nft.price)} ETH</span>
          </div>
          <div className="flex items-start">
            <span className="text-lg font-semibold">状态: {nft.listed ? "已上架" : "未上架"}</span>
          </div>
        </div>

        <div className="mt-auto space-y-2 w-full">
          {nft.listed && (
            <button
              className="btn btn-secondary w-full hover:bg-opacity-90 transition-colors duration-300"
              onClick={handlePurchaseNft}
            >
              购买
            </button>
          )}
          {isOwner && nft.listed && (
            <button
              className="btn btn-error w-full hover:bg-opacity-90 transition-colors duration-300"
              onClick={handleUnlistNft}
            >
              下架
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
