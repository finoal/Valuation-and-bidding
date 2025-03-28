"use client";

import { useState } from "react";
import { usePublicClient, useAccount } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { addToIPFS, uploadImageToIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import { NextPage } from "next";
//进行数据库操作;
import axios from "axios";
import { Hash } from "viem";

const CreateNft: NextPage = () => {
  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");
  const { address, isConnected } = useAccount();
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState<string>("");
  const [kind, setKind] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [royaltyFee, setRoyaltyFee] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      setFiles(Array.from(selectedFiles));
    }
  };
  //获取合约的操作信息
  const publicClient = usePublicClient();

  // 将交易数据保存到数据库
  const saveTransactionToDatabase = async (
    blockNumber: bigint,
    blockTimestamp: bigint,
    transactionHash: Hash,
    fromAddress: string,
    toAddress: string, 
    gas: bigint,
    status: "success" | "reverted" | string,
    operationDescription: string
  ) => {
    try {
      const response = await axios.post('http://localhost:3001/addTransaction', {
        blockNumber: blockNumber.toString(),
        blockTimestamp: new Date(Number(blockTimestamp) * 1000).toISOString().slice(0, 19).replace('T', ' '),
        transactionHash,
        fromAddress,
        toAddress,
        gas: gas.toString(),
        status,
        operationDescription
      });
      
      console.log('交易数据已保存到数据库:', response.data);
      return response.data;
    } catch (error) {
      console.error('保存交易数据失败:', error);
      throw error;
    }
  };

  const handleMintNft = async () => {
    if (files.length === 0 || !isConnected) {
      alert("请上传至少一个图片，并确保您的钱包已连接。");
      return;
    }

    setIsProcessing(true);
    const notificationId = notification.loading("正在上传到IPFS");
    try {
      const metadataUris: string[] = [];
      const royaltyFeeArray: bigint[] = [];

      for (const file of files) {
        const imageResponse = await uploadImageToIPFS(file);
        const imageUri = `https://gateway.pinata.cloud/ipfs/${imageResponse}`;
        const metadata = {
          name,
          kind,
          description,
          image: imageUri,
          attributes: [
            { trait_type: "language", value: "solidity" },
            { trait_type: "os", value: "Windows" },
            { trait_type: "speed", value: "fast" },
          ],
        };

        const metadataResponse = await addToIPFS(metadata);
        const metadataUri = `${metadataResponse.IpfsHash}`;
        metadataUris.push(metadataUri);
        royaltyFeeArray.push(BigInt(Math.min(royaltyFee, 10)));
      }

      notification.remove(notificationId);
      notification.success("元数据已上传到IPFS");

      for (let index = 0; index < metadataUris.length; index++) {
        const cid = metadataUris[index];
        const royalty = royaltyFeeArray[index];
        
        // 铸造NFT
        const txHash = await writeContractAsync({
          functionName: "mintItem",
          args: [address, cid, royalty],
        });
        
        if (!publicClient || !txHash) {
          notification.error("获取交易信息失败");
          continue;
        }
        
        // 获取交易收据
        const receipt = await publicClient?.waitForTransactionReceipt({ 
          hash: txHash as Hash
        });
        
        // 获取区块信息
        const block = await publicClient?.getBlock({ 
          blockNumber: receipt.blockNumber 
        });
        
        // 将交易数据保存到数据库
        await saveTransactionToDatabase(
          receipt.blockNumber,
          block.timestamp,
          receipt.transactionHash,
          address || '', // 发送者
          receipt.to || '', // 接收者（合约地址）
          receipt.gasUsed, // 使用的gas
          receipt.status, // 交易状态
          `创建拍品 - ${name}` // 操作描述
        );
      }

      notification.success("藏品创建成功!");
    } catch (error) {
      notification.remove(notificationId);
      console.error(error);
      notification.error("铸造藏品失败");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRoyaltyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fee = Number(event.target.value);
    if (fee < 0 || fee > 10) {
      notification.error("版税费用必须在0到10%之间");
      setRoyaltyFee(0);
    } else {
      setRoyaltyFee(fee);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-blue-500 to-green-500">
      <div className="flex bg-white shadow-xl rounded-xl overflow-hidden max-w-3xl w-full">
        {/* 左侧图片区域 */}
        <div className="hidden md:block md:w-1/3 bg-gradient-to-br from-blue-400 to-green-400">
          <div className="flex items-center justify-center h-full">
            <img
              src="https://peach-obedient-peafowl-970.mypinata.cloud/ipfs/bafybeig7ts2xb2jn435bzfyarlxkjhh7ucohsyhjvgln763erpn7omsvwe?pinataGatewayToken=r6y5mp8OMzhdDC_MvCV6xQ9PAi9qmBnn6_TBvdvT40ygLAJqmHuaeRpSMYtOskf8"
              alt="NFT Preview"
              className="object-cover w-full h-full"
            />
          </div>
        </div>

        {/* 右侧表单区域 */}
        <div className="w-full md:w-2/3 p-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">添加藏品</h1>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="input input-bordered w-full mb-4 p-4 rounded-xl"
          />
          <input
            type="text"
            placeholder="拍品名称"
            value={name}
            onChange={e => setName(e.target.value)}
            className="input input-bordered w-full mb-4 p-4 rounded-xl"
          />
          <input
            type="text"
            placeholder="拍品种类"
            value={kind}
            onChange={e => setKind(e.target.value)}
            className="input input-bordered w-full mb-4 p-4 rounded-xl"
          />
          <textarea
            placeholder="描述"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="input input-bordered w-full mb-4 p-4 rounded-xl"
          />
          <div className="mb-4">
            <label className="block mb-1 font-medium text-gray-700">版税费用 (0-10%):</label>
            <input
              type="number"
              value={royaltyFee}
              onChange={handleRoyaltyChange}
              className="input input-bordered w-full p-4 rounded-xl"
            />
          </div>
          <button
            onClick={handleMintNft}
            disabled={isProcessing}
            className={`btn w-full p-4 rounded-xl text-white ${isProcessing ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"} transition duration-300`}
          >
            {isProcessing ? "创建中..." : "创建藏品"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateNft;
