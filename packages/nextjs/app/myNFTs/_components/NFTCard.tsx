"use client";

import { useState } from "react";
import { Collectible } from "./MyHoldings";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { useRouter } from "next/navigation"; // 页面跳转

export const NFTCard = ({ nft, updateCollectible }: { nft: Collectible; updateCollectible: (updatedNft: Collectible) => void }) => {
  // };
  // export const NFTCard = ({ nft }: { nft: Collectible }) => {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false); // 控制弹窗显示状态
  const [startPrice, setStartPrice] = useState(0);
  const [selectedDateTime, setSelectedDateTime] = useState<string>("");

  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");
  const { data: auction } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getAuction",
    args: [BigInt(nft.id.toString())],
  });

  // 截断描述文本，限制为50个字符
  const truncateDescription = (text: string | undefined, maxLength: number = 50) => {
    if (!text) return "";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const handleCreateAuction = async () => {
    if (!startPrice || !selectedDateTime) {
      notification.error("请输入起拍价格和结束时间！");
      return;
    }

    const notificationId = notification.loading("正在创建拍卖...");
    try {
      const endTime = Math.floor(new Date(selectedDateTime).getTime() / 1000); // 转换为时间戳
      await writeContractAsync({
        functionName: "createAuction",
        args: [
          BigInt(nft.id.toString()),
          nft.uri,
          BigInt(startPrice * 10 ** 18), // 转为 wei 单位
          BigInt(endTime),
        ],
      });

      notification.remove(notificationId);
      notification.success("拍卖创建成功！");
      setIsModalOpen(false); // 关闭弹窗
    } catch (error) {
      notification.remove(notificationId);
      notification.error("拍卖创建失败！");
      console.error(error);
    }
  };

  const handleEndAuction = async () => {
    try {
      const now = Math.floor(Date.now() / 1000); // 当前时间戳（秒）

      await writeContractAsync({
        functionName: "endAuction",
        args: [BigInt(nft.id.toString()), BigInt(now)],
      });
    } catch (error) {
      console.error(error);
    }
  };

  // 改变鉴定状态逻辑
  const handleToggleAccreditation = async () => {
    console.log("nftid", BigInt(nft.id.toString()));
    console.log(!nft.isAccredited);
    const notificationId = notification.loading("正在更新鉴定状态...");

    try {
      await writeContractAsync({
        functionName: "modiyAccredited", // 假设智能合约有这个函数
        args: [BigInt(nft.id.toString()), !nft.isAccredited], // 切换鉴定状态
      });

      notification.remove(notificationId);
      notification.success("鉴定状态更新成功！");
      updateCollectible({ ...nft, isAccredited: !nft.isAccredited });
    } catch (error) {
      notification.remove(notificationId);
      notification.error("鉴定状态更新失败！");
      console.error(error);
    }
  };

  // 封装跳转逻辑
  const handleNavigateToDetail = (nft: number) => {
    console.log(`NFT 选中, Token ID: ${nft}`);
    localStorage.setItem("selectedNft", JSON.stringify(nft));
    router.push(`/userAuth`);
  };

  return (
    <div className="card card-compact bg-base-100 shadow-lg w-[300px] h-[550px] shadow-secondary hover:shadow-xl transition-shadow duration-300">
      <div className="cursor-pointer" onClick={() => handleNavigateToDetail(nft.id)}>
        <figure className="relative h-[180px] overflow-hidden">
          <img src={nft.image} alt="NFT Image" className="w-full h-full object-cover" />
          <figcaption className="glass absolute bottom-4 left-4 p-4 rounded-xl backdrop-blur-sm">
            <span className="text-white font-semibold"># {nft.id}</span>
          </figcaption>
        </figure>
      </div>
      <div className="card-body flex flex-col h-[370px] p-4">
        <div className="flex-grow space-y-2">
          <div className="flex items-start">
            <p className="text-xl p-0 m-0 font-semibold truncate w-full">名称 : {nft.name}</p>
          </div>
          <div className="flex items-start">
            <p className="text-xl p-0 m-0 font-semibold truncate w-full">种类 : {nft.kind}</p>
          </div>
          <div className="flex items-start">
            <p className="text-xl p-0 m-0 font-semibold break-words line-clamp-3">
              描述 : {truncateDescription(nft.description, 100)}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-lg font-semibold">所有人 : </span>
            <Address address={nft.owner} />
          </div>
          <div className="flex items-start">
            <span className="text-lg font-semibold">是否允许鉴定 : </span>
            <span className="text-lg font-semibold ml-2">{nft.isAccredited ? '允许' : '不允许'}</span>
          </div>
        </div>
        
        <div className="mt-auto space-y-2 w-full">
          <button 
            className="btn btn-danger w-full hover:bg-opacity-90 transition-colors duration-300" 
            onClick={() => handleToggleAccreditation()}
          >
            {nft.isAccredited ? "取消允许鉴定" : "允许鉴定"}
          </button>
          
          {!auction?.isActive && (
            <button 
              className="btn btn-primary w-full" 
              onClick={() => setIsModalOpen(true)}
            >
              创建拍卖
            </button>
          )}

          {auction?.isActive && (
            <button 
              className="btn btn-danger w-full" 
              onClick={handleEndAuction}
            >
              结束拍卖
            </button>
          )}
        </div>
      </div>

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
                <button className="btn btn-primary" onClick={handleCreateAuction}>
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
