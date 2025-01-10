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
    <div className="card card-compact bg-base-100 shadow-lg w-[300px] shadow-secondary">
      <figure className="relative">
        <img src={nft.image} alt="NFT Image" className="h-60 min-w-full" />
        <figcaption className="glass absolute bottom-4 left-4 p-4 w-25 rounded-xl">
          <span className="text-white"># {nft.id}</span>
        </figcaption>
      </figure>
      <div className="card-body space-y-3">
        <div className="flex items-center justify-center">
          <p className="text-xl p-0 m-0 font-semibold">{nft.name}</p>
          <div className="flex flex-wrap space-x-2 mt-1">
            {nft.attributes?.map((attr, index) => (
              <span key={index} className="badge badge-primary py-3">
                {attr.value}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-center mt-1">
          <p className="my-0 text-lg">{nft.description}</p>
        </div>
        <div className="flex space-x-3 mt-1 items-center">
          <span className="text-lg font-semibold">Owner : </span>
          <Address address={nft.owner} />
        </div>
        <div className="flex space-x-3 mt-1 items-center">
          <span className="text-lg font-semibold">Price: {ethers.formatEther(nft.price)} ETH</span>
        </div>
        <div className="flex space-x-3 mt-1 items-center">
          <span className="text-lg font-semibold">Listed: {nft.listed ? "已上架" : "未上架"}</span>
        </div>
        <div className="card-actions justify-end space-x-3">
          {nft.listed && (
            <button
              className="btn btn-secondary btn-md px-8 tracking-wide"
              onClick={handlePurchaseNft}
            >
              购买
            </button>
          )}
          {isOwner && nft.listed && (
            <button
              className="btn btn-error btn-md px-8 tracking-wide"
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
