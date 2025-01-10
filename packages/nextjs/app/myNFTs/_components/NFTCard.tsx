import { useState } from "react";
import { Collectible } from "./MyHoldings";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export const NFTCard = ({ nft }: { nft: Collectible }) => {
  const [startPrice, setStartPrice] = useState(0);
  const [duration, setDuration] = useState(0);

  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");
  const { data: nftItem } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getNftItem",
    args: [BigInt(nft.id.toString())],
  });

  const { data: auction } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getAuction",
    args: [BigInt(nft.id.toString())],
  });

  const handleCreateAuction = async () => {
    const notificationId = notification.loading("Checking NFT state...");
    try {
      if (nftItem?.isListed) {
        notification.remove(notificationId);
        notification.error("NFT is already listed for sale.");
        return;
      }

      console.log("获取tokenId1" + BigInt(nft.id.toString()));
      await writeContractAsync({
        functionName: "createAuction",
        args: [
          BigInt(nft.id.toString()),
          nft.uri,
          BigInt(startPrice * 10 ** 18), // 转换起拍价格为 wei 单位，并确保类型是 bigint
          BigInt(duration), // 持续时间也需要是 bigint 类型
        ],
      });

      notification.remove(notificationId);
      notification.success("Auction created successfully!");
    } catch (error) {
      notification.remove(notificationId);
      notification.error("Failed to create auction.");
      console.error(error);
    }
  };

  const handleEndAuction = async () => {
    const notificationId = notification.loading("Ending Auction...");
    try {
      console.log(auction?.endTime);
      const now = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
      console.log(auction);
      if (now < Number(auction?.endTime)) {
        await writeContractAsync({
          functionName: "endAuction",
          args: [BigInt(nft.id.toString())],
        });
      }

      notification.remove(notificationId);
      notification.success("Auction ended successfully!");
    } catch (error) {
      notification.remove(notificationId);
      notification.error("Failed to end auction.");
      console.error(error);
    }
  };

  return (
    <div className="card card-compact bg-base-100 shadow-lg w-[300px] shadow-secondary">
      <figure className="relative">
        <img src={nft.image} alt="NFT Image" className="h-60 min-w-full" />
        <figcaption className="glass absolute bottom-4 left-4 p-4 w-25 rounded-xl">
          <span className="text-white "># {nft.id}</span>
        </figcaption>
      </figure>
      <div className="card-body space-y-3">
        <div className="flex items-center justify-center">
          <p className="text-xl p-0 m-0 font-semibold">{nft.name}</p>
        </div>
        <div className="flex space-x-3 mt-1 items-center">
          <span className="text-lg font-semibold">Owner : </span>
          <Address address={nft.owner} />
        </div>

        {/* 创建拍卖表单 */}
        <div className="flex flex-col my-2 space-y-1">
          <span className="text-lg font-semibold mb-1">Start Auction: </span>
          <input
            type="number"
            placeholder="Start Price (ETH)"
            className="input input-bordered"
            onChange={e => setStartPrice(Number(e.target.value))}
          />
          <input
            type="number"
            placeholder="Duration (seconds)"
            className="input input-bordered"
            onChange={e => setDuration(Number(e.target.value))}
          />
          <button className="btn btn-primary mt-2" onClick={handleCreateAuction}>
            Create Auction
          </button>
        </div>

        {/* 结束拍卖按钮 */}
        {auction?.isActive && (
          <button className="btn btn-danger mt-4" onClick={handleEndAuction}>
            End Auction
          </button>
        )}
      </div>
    </div>
  );
};
