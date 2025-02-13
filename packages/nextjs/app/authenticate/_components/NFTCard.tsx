"use client";

import { useState } from "react";
import { Collectible } from "./MyHoldings";
import { Address } from "~~/components/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { uploadImageToIPFS, addToIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useRouter } from "next/navigation"; //页面跳转

export const NFTCard = ({
  nft,
  updateCollectible,
}: {
  nft: Collectible;
  updateCollectible: (updatedNft: Collectible) => void;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false); // 控制弹窗显示状态
  const [description, setDescription] = useState(""); // 鉴定描述
  const [files, setFiles] = useState<File[]>([]); // 上传的图片
  const [isProcessing, setIsProcessing] = useState(false);

  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");
  const router = useRouter();
  // 处理文件选择
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      setFiles(Array.from(selectedFiles));
    }
  };

  // 上传鉴定信息至 IPFS 并调用合约
  const handleAccreditation = async () => {
    if (!description.trim()) {
      notification.error("请填写鉴定描述！");
      return;
    }
    if (files.length === 0) {
      notification.error("请上传至少一张图片！");
      return;
    }

    setIsProcessing(true);
    const notificationId = notification.loading("正在上传鉴定信息到 IPFS...");

    try {
      // 上传图片到 IPFS
      const imageUrls: string[] = [];
      for (const file of files) {
        const imageHash = await uploadImageToIPFS(file);
        imageUrls.push(`https://gateway.pinata.cloud/ipfs/${imageHash}`);
      }

      // 上传鉴定信息到 IPFS
      const accreditationData = {
        description,
        images: imageUrls,
      };
      const ipfsResponse = await addToIPFS(accreditationData);
      const ipfsUri = `https://gateway.pinata.cloud/ipfs/${ipfsResponse.IpfsHash}`;

      // 调用合约进行鉴定
      await writeContractAsync({
        functionName: "performAccreditation",
        args: [BigInt(nft.id.toString()), ipfsUri],
      });

      notification.remove(notificationId);
      notification.success("鉴定完成！");
      setIsModalOpen(false);

      // 更新卡片信息
      updateCollectible({
        ...nft,
        accreditedCount: (nft.accreditedCount || 0) + 1, // 更新鉴定次数
      });

      // 提示费用分配规则
      alert(
        "鉴定完成！请注意：只有该藏品拍卖成功后，参与鉴定的机构将瓜分拍卖价值的 20%。"
      );
    } catch (error) {
      notification.remove(notificationId);
      notification.error("鉴定失败，请重试！");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };
  // 封装跳转逻辑，不使用 URL 传参
    const handleNavigateToDetail = (nft: Collectible) => {
      nft.accreditedCount = Number(nft.accreditedCount);
      console.log(`NFT 选中,Token ID: ${nft.id}`);
      // 将选择的 NFT 存储到状态中，之后在详情页面访问
      localStorage.setItem("selectedNft", JSON.stringify(nft)); // 使用 localStorage 保存数据
      router.push(`/nftMessage`);
    };

  return (
    <div className="card card-compact bg-base-100 shadow-lg w-[300px] shadow-secondary">
      <div className="cursor-pointer" onClick={() => handleNavigateToDetail(nft)}>
      <figure className="relative">
        <img src={nft.image} alt="NFT Image" className="h-60 min-w-full" />
        <figcaption className="glass absolute bottom-4 left-4 p-4 w-25 rounded-xl">
          <span className="text-white "># {nft.id}</span>
        </figcaption>
      </figure>
      </div>
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
        <div className="flex items-center justify-center">
          <p className="text-xl p-0 m-0 font-semibold">
            被鉴定数 : {Number(nft.accreditedCount)}
          </p>
        </div>
        <div className="flex items-center justify-center">
          <p className="text-xl p-0 m-0 font-semibold">
            所有人 : <Address address={nft.owner} />
          </p>
        </div>

        {/* 发起鉴定按钮 */}
        <button
          className="btn btn-primary mt-4"
          onClick={() => setIsModalOpen(true)}
        >
          开始鉴定
        </button>
      </div>

      {/* 鉴定信息弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">填写鉴定信息</h2>
            <textarea
              className="textarea textarea-bordered w-full mb-4"
              placeholder="请输入鉴定描述..."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="input input-bordered w-full mb-4"
            />
            <div className="flex justify-end space-x-4">
              <button
                className="btn btn-secondary"
                onClick={() => setIsModalOpen(false)}
              >
                取消
              </button>
              <button
                className={`btn btn-primary ${isProcessing ? "loading" : ""}`}
                onClick={handleAccreditation}
                disabled={isProcessing}
              >
                {isProcessing ? "鉴定中..." : "确认"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
