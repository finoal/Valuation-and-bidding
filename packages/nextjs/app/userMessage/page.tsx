"use client";

import { useState } from "react";
import { usePublicClient, useAccount } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { addToIPFS, uploadImageToIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import { NextPage } from "next";

const UpdateAssessInfo: NextPage = () => {
  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");
  const [files, setFiles] = useState<File[]>([]);
  const [imageUri] = useState<string[]>([]);
  const { address, isConnected } = useAccount();
  const [institutionName, setInstitutionName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      setFiles(Array.from(selectedFiles));
    }
  };

  const handleUpdateInfo = async () => {
    if (files.length === 0) {
      alert("请上传至少一个图片");
      return;
    }
    if (!institutionName || !description || !isConnected) {
      notification.error("请填写完整信息并确保您的钱包已连接。");
      return;
    }

    setIsProcessing(true);
    const notificationId = notification.loading("正在上传到IPFS...");
    try {
      // 上传证书到 IPFS

      for (const file of files) {
        const imageResponse = await uploadImageToIPFS(file);
        const Uri = `https://gateway.pinata.cloud/ipfs/${imageResponse}`;
        imageUri.push(Uri);
        console.log(imageUri);
      }

      // 生成元数据
      const metadata = {
        name: institutionName,
        description,
        certificate: imageUri,
      };

      // 上传元数据到 IPFS
      const metadataResponse = await addToIPFS(metadata);
      const metadataUri = `https://gateway.pinata.cloud/ipfs/${metadataResponse.IpfsHash}`;

      notification.remove(notificationId);
      notification.success("元数据已上传到IPFS");

      // 调用合约函数，更新鉴定机构信息
      await writeContractAsync({
        functionName: "updateUserInfo",
        args: [metadataUri],
      });

      notification.success("鉴定机构信息更新成功！");
    } catch (error) {
      notification.remove(notificationId);
      console.error(error);
      notification.error("更新鉴定机构信息失败！");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-blue-500 to-green-500">
      <div className="flex bg-white shadow-xl rounded-xl overflow-hidden max-w-3xl w-full">
        {/* 左侧图片区域 */}
        <div className="hidden md:block md:w-1/3 bg-gradient-to-br from-blue-400 to-green-400">
          <div className="flex items-center justify-center h-full">
            <img
              src="https://gateway.pinata.cloud/ipfs/bafybeifrki6oqfko2wunc6e4v6dqfkjui3wdovwsj77vdijjveqnozzugq"
              alt="Institution Preview"
              className="object-cover w-full h-full"
            />
          </div>
        </div>

        {/* 右侧表单区域 */}
        <div className="w-full md:w-2/3 p-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">更新鉴定机构信息</h1>
          <input
            type="text"
            placeholder="机构名称"
            value={institutionName}
            onChange={e => setInstitutionName(e.target.value)}
            className="input input-bordered w-full mb-4 p-4 rounded-xl"
          />
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="input input-bordered w-full mb-4 p-4 rounded-xl"
          />
          <textarea
            placeholder="描述"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="input input-bordered w-full mb-4 p-4 rounded-xl"
          />
          <button
            onClick={handleUpdateInfo}
            disabled={isProcessing}
            className={`btn w-full p-4 rounded-xl text-white ${
              isProcessing ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"
            } transition duration-300`}
          >
            {isProcessing ? "更新中..." : "更新信息"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateAssessInfo;
