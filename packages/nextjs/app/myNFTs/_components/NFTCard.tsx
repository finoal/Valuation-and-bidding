"use client";

import { useState } from "react";
import { Collectible } from "./MyHoldings";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

export const NFTCard = ({ nft, updateCollectible }: { nft: Collectible; updateCollectible: (updatedNft: Collectible) => void }) => {
  // };
  // export const NFTCard = ({ nft }: { nft: Collectible }) => {
  const [isModalOpen, setIsModalOpen] = useState(false); // 控制弹窗显示状态
  const [startPrice, setStartPrice] = useState(0);
  const [selectedDateTime, setSelectedDateTime] = useState<string>("");

  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");
  const { data: auction } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getAuction",
    args: [BigInt(nft.id.toString())],
  });

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
    const notificationId = notification.loading("正在结束拍卖...");
    try {
      const now = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
      if (now < Number(auction?.endTime)) {
        await writeContractAsync({
          functionName: "endAuction",
          args: [BigInt(nft.id.toString())],
        });
      }

      notification.remove(notificationId);
      notification.success("拍卖成功结束！");
    } catch (error) {
      notification.remove(notificationId);
      notification.error("结束拍卖失败！");
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
      // 更新本地状态以触发重新渲染
      updateCollectible({ ...nft, isAccredited: !nft.isAccredited });
    } catch (error) {
      notification.remove(notificationId);
      notification.error("鉴定状态更新失败！");
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
          <p className="text-xl p-0 m-0 font-semibold">名称 : {nft.name}</p>
        </div>
        <div className="flex items-center justify-center">
          <p className="text-xl p-0 m-0 font-semibold">种类 : {nft.kind}</p>
        </div>
        <div className="flex items-center justify-center">
          <p className="text-xl p-0 m-0 font-semibold">描述 : {nft.description}</p>
        </div>
        <div className="flex space-x-3 mt-1 items-center">
          <span className="text-lg font-semibold">所有人 : </span>
          <Address address={nft.owner} />
        </div>
        <div className="flex space-x-3 mt-1 items-center">
          <span className="text-lg font-semibold">是否允许鉴定 : </span>
          <span className="text-lg font-semibold">{nft.isAccredited ? '允许' : '不允许'}</span>
        </div>
        {/* 改变鉴定状态按钮 */}
        <button className="btn btn-danger mt-4" onClick={() => handleToggleAccreditation()}>
          {nft.isAccredited ? "取消允许鉴定" : "允许鉴定"}
        </button>
        {/* 创建拍卖按钮 */}
        {!auction?.isActive && (
          <button className="btn btn-primary mt-4" onClick={() => setIsModalOpen(true)}>
            创建拍卖
          </button>
        )}

        {/* 结束拍卖按钮 */}
        {auction?.isActive && (
          <button className="btn btn-danger mt-4" onClick={handleEndAuction}>
            结束拍卖
          </button>
        )}
      </div>

      {/* 弹窗 */}
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
