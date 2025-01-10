"use client";

import { useEffect, useState } from "react";
import { usePublicClient, useAccount } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { addToIPFS, uploadImageToIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import { NextPage } from "next";
import axios from "axios";
// import { connect } from "http2";

const CreateNft: NextPage = () => {
  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible");
  const { address, isConnected } = useAccount();
  const [files, setFiles] = useState<File[]>([]); // 存储多个文件
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [royaltyFee, setRoyaltyFee] = useState<number>(0); // 版税费用
  const [isProcessing, setIsProcessing] = useState<boolean>(false); // 防止重复提交

  useEffect(() => {
    // 如果需要，可以在这里加载签名者（signer）
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      setFiles(Array.from(selectedFiles)); // 更新状态，存储多个文件
    }
  };
  const publicClient = usePublicClient();
  const handleMintNft = async () => {
    if (files.length === 0 || !isConnected) {
      alert("请上传至少一个图片，并确保您的钱包已连接。");
      return;
    }

    setIsProcessing(true); // 处理过程中禁用按钮

    const notificationId = notification.loading("正在上传到IPFS");

    try {
      const metadataUris: string[] = [];
      const royaltyFeeArray: bigint[] = []; // 存储每个NFT的版税费用

      // 遍历每个文件，上传并生成相应的元数据
      for (const file of files) {
        const imageResponse = await uploadImageToIPFS(file);
        const imageUri = `https://gateway.pinata.cloud/ipfs/${imageResponse}`;
        const metadata = {
          name,
          description,
          image: imageUri,
          attributes: [
            {
              "trait_type": "language",
              "value": "solidity"
            },
            {
              "trait_type": "os",
              "value": "Windows"
            },
            {
              "trait_type": "speed",
              "value": "fast"
            }
          ] // 可以在这里添加更多的属性
        };

        const metadataResponse = await addToIPFS(metadata);
        const metadataUri = `${metadataResponse.IpfsHash}`;
        metadataUris.push(metadataUri);
        // 将每个NFT的版税费用加入到数组中
        royaltyFeeArray.push(BigInt(Math.min(royaltyFee, 10))); // 确保版税费用不超过最大值10%
      }

      // 确保两个数组长度相同
      if (metadataUris.length !== royaltyFeeArray.length) {
        throw new Error("元数据URI数组和版税费用数组长度不一致");
      }

      notification.remove(notificationId);
      notification.success("元数据已上传到IPFS");

      for (let index = 0; index < metadataUris.length; index++) {
        const cid = metadataUris[index];
        const royalty = royaltyFeeArray[index];
        const tx = await writeContractAsync({
          functionName: "mintItem", // 假设你的合约有 mintBatch 函数
          args: [address, cid, royalty], // 传递元数据URI数组和版税数组
        });
        console.log(tx);
        const receipt = await publicClient?.getTransactionReceipt({ hash: tx as `0x${string}` });
        console.log(receipt);
        const nft_id = receipt?.logs[0].topics[3];
        const newTokenId = parseInt(nft_id as `0x${string}`, 16);
        console.log(newTokenId);
        if (newTokenId) {
          const nftDetails = {
            cid,
            category: name,
            address: address,
            tokenId: newTokenId.toString(),
            royaltyFeeNumber: royalty.toString(),
          };
          setMintedNFTDetails(nftDetails);
          console.log("开始数据库操作");
          await axios.post("http://localhost:3001/saveNft", {
            tokenId: Number(newTokenId),
            category: nftDetails.category,
            owner: nftDetails.address,
            creater: nftDetails.address,
            royalty: nftDetails.royaltyFeeNumber,
            cid: nftDetails.cid,
            status: "false",
            lease: "false",
            price: 0,
            created_at: new Date().toISOString().replace("T", " ").split(".")[0],
          });
        }
      }
      // 批量铸造NFT - 假设你的合约支持批量铸造
      notification.success("NFT成功铸造!");
    } catch (error) {
      notification.remove(notificationId);
      console.error(error);
      notification.error("铸造NFT失败");
    } finally {
      setIsProcessing(false); // 处理完成后恢复按钮状态
    }
  };

  const handleRoyaltyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fee = Number(event.target.value);
    if (fee < 0 || fee > 10) {
      notification.error("版税费用必须在0到10%之间");
      setRoyaltyFee(0); // 如果输入无效，则重置为0
    } else {
      setRoyaltyFee(fee);
    }
  };

  const setMintedNFTDetails = (details: { cid: string; category: string; address: `0x${string}` | undefined; tokenId: string; royaltyFeeNumber: string; }) => {
    // 这里可以添加将铸造的NFT详情存储到状态或数据库的逻辑
    // 例如，可以将详情存储到全局状态管理库（如Redux）或调用API存储到后端数据库
    console.log("Minted NFT Details:", details);
  };

  return (
    <div className="create-nft-container">
      <h1>创建NFT</h1>
      <input type="file" accept="image/*" multiple onChange={handleFileChange} /> {/* 支持选择多个文件 */}
      <input
        type="text"
        placeholder="NFT名称"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <textarea
        placeholder="NFT描述"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <div>
        <label>
          版税费用 (0-10%):
          <small> 版税费用将应用于您的NFT转售。请输入0到10之间的百分比。</small>
        </label>
        <input
          type="number"
          placeholder="版税费用 (0-10%)"
          value={royaltyFee}
          onChange={handleRoyaltyChange}
        />
      </div>
      
      <button onClick={handleMintNft} disabled={isProcessing}>创建NFTs</button> {/* 禁用按钮，防止重复提交 */}

      <style jsx>{`
        .create-nft-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          border: 1px solid #ccc;
          border-radius: 8px;
          background-color: #f9f9f9;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        h1 {
          text-align: center;
          margin-bottom: 20px;
        }
        input,
        textarea,
        button {
          width: 100%;
          padding: 10px;
          margin-bottom: 15px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        input:focus,
        textarea:focus {
          border-color: #0070f3;
          outline: none;
        }
        button {
          background-color: #0070f3;
          color: white;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        button:hover {
          background-color: #005bb5;
        }
        button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        small {
          display: block;
          font-size: 0.9em;
          color: #555;
        }
      `}</style>
    </div>
  );
};

export default CreateNft;
