"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract, useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import Link from "next/link";
import { uploadImageToIPFS, addToIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import axios from "axios";
import { Hash } from "viem";
import { usePublicClient } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";

// 分页组件
const Pagination = ({ 
  currentPage, 
  totalItems, 
  itemsPerPage, 
  onPageChange 
}: { 
  currentPage: number; 
  totalItems: number; 
  itemsPerPage: number; 
  onPageChange: (pageNumber: number) => void; 
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // 如果只有一页，不显示分页
  if (totalPages <= 1) {
    return null;
  }

  // 生成页码数组
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5; // 最多显示5个页码

    if (totalPages <= maxPagesToShow) {
      // 如果总页数小于等于最大显示页数，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // 否则，显示当前页附近的页码
      let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
      let endPage = startPage + maxPagesToShow - 1;

      if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }

    return pageNumbers;
  };

  return (
    <div className="flex items-center gap-2">
      <div className="btn-group">
        {/* 上一页按钮 */}
        <button
          className="btn btn-sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          «
        </button>

        {/* 页码按钮 */}
        {getPageNumbers().map((number) => (
          <button
            key={number}
            className={`btn btn-sm ${currentPage === number ? "btn-active" : ""}`}
            onClick={() => onPageChange(number)}
          >
            {number}
          </button>
        ))}

        {/* 下一页按钮 */}
        <button
          className="btn btn-sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          »
        </button>
      </div>
      <span className="text-sm text-gray-500">
        第 {currentPage} 页，共 {totalPages} 页
      </span>
    </div>
  );
};

// NFT类型定义
interface NFTItem {
  tokenId: bigint;
  price: bigint;
  seller: string;
  isListed: boolean;
  tokenUri: string;
  isAccredited: boolean;
  accreditedCount: bigint;
  accreditedInstitutions: readonly string[];
}

// NFT元数据类型定义
interface NFTMetadata {
  name: string;
  kind: string;
  description: string;
  image: string;
  attributes: {
    trait_type: string;
    value: string;
  }[];
}

// 拍卖类型定义
interface Auction {
  tokenId: bigint;
  uri: string;
  seller: string;
  startPrice: bigint;
  highestBid: bigint;
  highestBidder: string;
  endTime: bigint;
  isActive: boolean;
  isroyalty: boolean;
  num: bigint;
  bidCount: bigint;
  bidders: readonly string[];
  startTime: bigint;
}

// 鉴定记录类型定义
interface AccreditationRecord {
  institution: string;
  message: string; // IPFS链接
  description?: string;
  images?: string[];
  timestamp: number;
}

const NFTDetailPage = () => {
  const params = useParams();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const tokenId = Number(params.tokenId);
  const tokenIdBigInt = BigInt(tokenId);

  const [nft, setNft] = useState<NFTItem | null>(null);
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'accreditations' | 'auction'>('accreditations');
  const [isAccrediting, setIsAccrediting] = useState(false);
  const [accreditationMessage, setAccreditationMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 分页相关状态
  const [accreditationRecords, setAccreditationRecords] = useState<AccreditationRecord[]>([]);
  const [accreditationPage, setAccreditationPage] = useState(1);
  const [auctionBidders, setAuctionBidders] = useState<string[]>([]);
  const [auctionPage, setAuctionPage] = useState(1);
  const itemsPerPage = 5;

  // 在组件内部添加新的状态
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
  
  // 添加标记表示是否正在编辑表单
  const [isEditing, setIsEditing] = useState(false);
  // 使用 ref 跟踪模态框是否打开
  const modalRef = useRef<HTMLDivElement>(null);

  // 使用useScaffoldReadContract获取NFT数据
  const { data: nftData, isLoading: isLoadingNft } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getNftItem",
    args: [tokenIdBigInt],
  });

  // 使用useScaffoldReadContract获取拍卖信息
  const { data: auctionData, isLoading: isLoadingAuction } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getAuction",
    args: [tokenIdBigInt],
  });

  // 使用useScaffoldReadContract获取用户信息
  const { data: userData } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getUser",
    args: [address as `0x${string}` | undefined],
    query: {
      enabled: !!address,
    }
  });

  // 使用useScaffoldEventHistory获取鉴定记录事件
  const { data: accreditationEvents, isLoading: isLoadingEvents } = useScaffoldEventHistory({
    contractName: "YourCollectible",
    eventName: "AccreditationPerformed",
    fromBlock: 0n,
    filters: { tokenId: tokenIdBigInt },
    watch: true,
  });

  // 使用useScaffoldWriteContract进行鉴定操作
  const { writeContractAsync: performAccreditationWrite } = useScaffoldWriteContract("YourCollectible");

  // 处理NFT数据
  useEffect(() => {
    if (nftData) {
      setNft(nftData as unknown as NFTItem);
      
      // 获取NFT元数据
      if (nftData.tokenUri) {
        const fetchMetadata = async () => {
          try {
            const ipfsHash = nftData.tokenUri.replace("https://gateway.pinata.cloud/ipfs/", "");
            const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
            if (!response.ok) throw new Error(`Failed to fetch metadata for token ${tokenId}`);
            
            const data = await response.json();
            setMetadata(data);
          } catch (err) {
            console.error(`Error fetching metadata for token ${tokenId}:`, err);
            setError(`获取拍品元数据失败: ${err}`);
          }
        };
        
        fetchMetadata();
      }
    }
  }, [nftData, tokenId]);

  // 处理拍卖数据
  useEffect(() => {
    if (auctionData) {
      setAuction(auctionData as unknown as Auction);
      
      if (auctionData.bidders && auctionData.bidders.length > 0) {
        setAuctionBidders(auctionData.bidders as unknown as string[]);
      }
    }
  }, [auctionData]);

  // 检查用户是否是鉴定机构
  useEffect(() => {
    if (userData) {
      setIsAccrediting(Boolean(userData[2]));
    }
  }, [userData]);

  // 处理文件选择
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      setFiles(Array.from(selectedFiles));
    }
  };

  // 获取真实的鉴定记录
  useEffect(() => {
    // 如果正在编辑表单，不进行刷新操作
    if (isEditing) return;
    
    const fetchAccreditationData = async () => {
      if (!accreditationEvents || accreditationEvents.length === 0) {
        return;
      }

      setLoadingRecords(true);
      try {
        // 获取每条记录的详细信息
        const records = await Promise.all(
          accreditationEvents.map(async event => {
            try {
              // 通过message参数获取IPFS数据
              const messageUrl = event.args.message;
              if (!messageUrl) {
                throw new Error("Message URL is undefined");
              }
              
              const response = await fetch(messageUrl);
              if (!response.ok) {
                throw new Error(`Failed to fetch data from ${messageUrl}`);
              }
              
              const jsonData = await response.json();
              
              return {
                institution: event.args.institution as string,
                message: messageUrl,
                description: jsonData.description || "无描述信息",
                images: jsonData.images || [],
                timestamp: Number(event.args.timestamp)
              };
            } catch (error) {
              console.error("Error fetching accreditation data:", error);
              // 如果无法获取IPFS数据，创建一个基础记录
              return {
                institution: event.args.institution as string,
                message: event.args.message || "",
                description: "无法加载鉴定详细信息",
                images: [],
                timestamp: Number(event.args.timestamp)
              };
            }
          })
        );

        // 按时间排序（最新的在前）
        const sortedRecords = records.sort((a, b) => b.timestamp - a.timestamp);
        setAccreditationRecords(sortedRecords as AccreditationRecord[]);
      } catch (error) {
        console.error("Error processing accreditation events:", error);
      } finally {
        setLoadingRecords(false);
      }
    };

    fetchAccreditationData();
  }, [accreditationEvents, isEditing]);

  // 更新加载状态
  useEffect(() => {
    setLoading(isLoadingNft || isLoadingAuction || isLoadingEvents);
  }, [isLoadingNft, isLoadingAuction, isLoadingEvents]);

  // 截断地址显示
  const truncateAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // 获取当前页的鉴定记录
  const getCurrentAccreditationRecords = () => {
    const indexOfLastItem = accreditationPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return accreditationRecords.slice(indexOfFirstItem, indexOfLastItem);
  };

  // 获取当前页的拍卖参与者
  const getCurrentAuctionBidders = () => {
    const indexOfLastItem = auctionPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return auctionBidders.slice(indexOfFirstItem, indexOfLastItem);
  };

  // 更新鉴定按钮处理函数
  const handleOpenAccreditationModal = () => {
    setIsEditing(true);
    document.getElementById('accreditation-modal')?.classList.add('modal-open');
  };

  // 当用户正在编辑时，防止accreditationEvents引起的刷新关闭模态框
  useEffect(() => {
    // 在编辑状态下，页面可能因为事件变化而刷新，重新打开模态框
    if (isEditing && modalRef.current && !modalRef.current.classList.contains('modal-open')) {
      modalRef.current.classList.add('modal-open');
    }
  }, [accreditationEvents, isEditing]);

  // 加载完成后，如果上次是在编辑状态，则重新打开模态框
  useEffect(() => {
    if (!loading && isEditing && modalRef.current) {
      modalRef.current.classList.add('modal-open');
    }
  }, [loading, isEditing]);

  // 在组件卸载前，保存编辑状态到localStorage
  useEffect(() => {
    // 从localStorage加载保存的表单数据
    const loadSavedForm = () => {
      const savedForm = localStorage.getItem(`accreditation-form-${tokenId}`);
      if (savedForm) {
        try {
          const formData = JSON.parse(savedForm);
          if (formData.message) {
            setAccreditationMessage(formData.message);
          }
          if (formData.isEditing) {
            setIsEditing(true);
            // 延迟打开模态框，确保DOM已经加载
            setTimeout(() => {
              document.getElementById('accreditation-modal')?.classList.add('modal-open');
            }, 100);
          }
        } catch (e) {
          console.error("Error loading saved form:", e);
        }
      }
    };

    loadSavedForm();

    // 设置beforeunload事件，防止用户意外关闭页面
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditing && accreditationMessage.trim()) {
        // 保存表单数据到localStorage
        localStorage.setItem(`accreditation-form-${tokenId}`, JSON.stringify({
          message: accreditationMessage,
          isEditing: isEditing
        }));
        
        // 标准的beforeunload处理，提示用户
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [tokenId, isEditing, accreditationMessage]);

  // 更新关闭鉴定模态框的函数
  const handleCloseAccreditationModal = () => {
    setIsEditing(false);
    setAccreditationMessage("");
    setFiles([]);
    document.getElementById('accreditation-modal')?.classList.remove('modal-open');
    
    // 清除保存的表单数据
    localStorage.removeItem(`accreditation-form-${tokenId}`);
  };

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

  // 修改鉴定功能，不自动刷新UI
  const performAccreditation = async () => {
    if (!address || !isAccrediting || !nft) return;
    if (!accreditationMessage.trim()) {
      notification.error("请填写鉴定描述！");
      return;
    }
    if (files.length === 0) {
      notification.error("请上传至少一张图片！");
      return;
    }

    setIsProcessing(true);
    const notificationId = notification.loading("正在提交鉴定...");

    try {
      // 上传图片到 IPFS
      const imageUrls: string[] = [];
      for (const file of files) {
        const imageHash = await uploadImageToIPFS(file);
        imageUrls.push(`https://gateway.pinata.cloud/ipfs/${imageHash}`);
      }

      // 上传鉴定信息到 IPFS
      const accreditationData = {
        description: accreditationMessage,
        images: imageUrls,
      };
      
      // 使用实际的IPFS上传函数
      const ipfsResponse = await addToIPFS(accreditationData);
      const ipfsUri = `https://gateway.pinata.cloud/ipfs/${ipfsResponse.IpfsHash}`;

      // 执行智能合约的鉴定功能
      const txHash = await performAccreditationWrite({
        functionName: "performAccreditation",
        args: [tokenIdBigInt, ipfsUri],
      });
      
      if (!publicClient || !txHash) {
        notification.remove(notificationId);
        notification.error("获取交易信息失败");
        return;
      }
      
      // 获取交易收据
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: txHash as Hash
      });
      
      // 获取区块信息
      const block = await publicClient.getBlock({ 
        blockNumber: receipt.blockNumber 
      });
      
      // 构建操作描述
      const nftName = metadata?.name || `拍品 #${tokenId}`;
      const opDescription = `发起鉴定 - 拍品ID: ${tokenId}, 名称: ${nftName}`;
      
      // 将交易数据保存到数据库
      await saveTransactionToDatabase(
        receipt.blockNumber,
        block.timestamp,
        receipt.transactionHash,
        address || '', // 发送者，确保非空
        receipt.to || '', // 接收者（合约地址）
        receipt.gasUsed, // 使用的gas
        receipt.status, // 交易状态
        opDescription // 操作描述
      );
      
      // 清空表单并关闭模态框
      handleCloseAccreditationModal();
      
      // 清除localStorage中保存的表单数据
      // localStorage.removeItem(`accreditation-form-${tokenId}`);
      
      // 设置加载状态，提示用户等待区块链确认
      setLoadingRecords(true);
      
      notification.remove(notificationId);
      notification.success("鉴定成功！您已成功提交鉴定报告。");
      notification.info("请注意：只有该藏品拍卖成功后，参与鉴定的机构将瓜分拍卖价值的 20%。");
      
      console.log("Transaction submitted:", txHash); // 记录交易哈希，方便调试
      
      // 成功完成交易后不直接更新UI，等待区块链事件的自动更新
      // 设置一个定时器在一段时间后隐藏加载状态
      setTimeout(() => {
        setLoadingRecords(false);
        // 交易完成后，重新允许页面刷新
        setIsEditing(false);
      }, 10000); // 10秒后隐藏加载状态
    } catch (err) {
      notification.remove(notificationId);
      console.error("Error performing accreditation:", err);
      notification.error("鉴定失败，请稍后再试");
      setLoadingRecords(false);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-error text-error-content p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!nft) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-warning text-warning-content p-4 rounded-lg">
          未找到拍品信息
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-4">
        <Link href="/accreditableNFTs" className="btn btn-sm btn-outline">
          « 返回列表
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧：NFT图片和基本信息 */}
        <div>
          <div className="card bg-base-100 shadow-xl overflow-hidden">
            {/* NFT图片 */}
            <figure className="h-96 relative">
              {metadata ? (
                <img 
                  src={metadata.image} 
                  alt={metadata.name} 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-base-200">
                  <p>加载中...</p>
                </div>
              )}
              <div className="absolute top-2 right-2 badge badge-primary">
                ID: {tokenId}
              </div>
            </figure>
            
            <div className="card-body">
              {/* NFT名称和类型 */}
              <h2 className="card-title">
                {metadata ? metadata.name : `拍品 #${tokenId}`}
                {nft?.isAccredited && (
                  <div className="badge badge-secondary">可鉴定</div>
                )}
              </h2>
              
              {metadata && (
                <>
                  <p className="text-sm text-gray-500">{metadata.kind}</p>
                  <p className="mt-2">{metadata.description}</p>
                </>
              )}
              
              {/* 基本信息 */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm font-semibold">发起者:</p>
                  <p className="text-sm">{nft ? truncateAddress(nft.seller) : '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">已鉴定次数:</p>
                  <p className="text-sm">{nft ? nft.accreditedCount.toString() : '0'}</p>
                </div>
                {/* 显示NFT属性 */}
                {metadata && metadata.attributes && metadata.attributes.length > 0 && (
                  <div className="col-span-2 mt-4">
                    <h3 className="text-md font-semibold mb-2">拍品属性</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {metadata.attributes.map((attr, index) => (
                        <div key={index} className="stat bg-base-200 rounded-box p-2">
                          <div className="stat-title text-xs">{attr.trait_type}</div>
                          <div className="stat-value text-sm">{attr.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* 鉴定按钮 */}
              {isAccrediting && (
                <div className="card-actions justify-end mt-4">
                  <button 
                    className="btn btn-primary"
                    onClick={handleOpenAccreditationModal}
                  >
                    鉴定此拍品
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 右侧：标签页内容 */}
        <div>
          <div className="tabs tabs-boxed mb-4">
            <a 
              className={`tab ${activeTab === 'accreditations' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('accreditations')}
            >
              鉴定记录 ({accreditationRecords.length})
            </a>
            <a 
              className={`tab ${activeTab === 'auction' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('auction')}
            >
              拍卖信息
            </a>
          </div>
          
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              {/* 鉴定记录 */}
              {activeTab === 'accreditations' && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">鉴定记录</h3>
                  
                  {loadingRecords ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                  ) : accreditationRecords.length === 0 ? (
                    <div className="text-center py-6">
                      <p>暂无鉴定记录</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-6">
                        {getCurrentAccreditationRecords().map((record, index) => (
                          <div key={index} className="bg-base-200 p-4 rounded-lg">
                            <div className="flex justify-between mb-2">
                              <span className="font-semibold">{truncateAddress(record.institution)}</span>
                              <span className="text-sm text-gray-500">{formatTimestamp(record.timestamp)}</span>
                            </div>
                            <p className="mb-3">{record.description}</p>
                            {record.images && record.images.length > 0 && (
                              <div className="grid grid-cols-3 gap-2 mt-2">
                                {record.images.map((img, idx) => (
                                  <div key={idx} className="relative group">
                                    <img 
                                      src={img} 
                                      alt={`鉴定图片 ${idx+1}`} 
                                      className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => setSelectedImage(img)}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* 分页控件 */}
                      <div className="flex justify-center mt-4">
                        <Pagination
                          currentPage={accreditationPage}
                          totalItems={accreditationRecords.length}
                          itemsPerPage={itemsPerPage}
                          onPageChange={setAccreditationPage}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {/* 拍卖信息 */}
              {activeTab === 'auction' && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">拍卖信息</h3>
                  
                  {!auction || !auction.isActive ? (
                    <div className="text-center py-6">
                      <p>该拍品当前没有进行中的拍卖</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="table w-full">
                          <tbody>
                            <tr>
                              <td className="font-semibold">拍卖状态</td>
                              <td>{auction.isActive ? "进行中" : "已结束"}</td>
                            </tr>
                            <tr>
                              <td className="font-semibold">卖家</td>
                              <td>{truncateAddress(auction.seller)}</td>
                            </tr>
                            <tr>
                              <td className="font-semibold">起拍价</td>
                              <td>{auction.startPrice.toString()} Wei</td>
                            </tr>
                            <tr>
                              <td className="font-semibold">当前最高出价</td>
                              <td>{auction.highestBid.toString()} Wei</td>
                            </tr>
                            {auction.highestBidder !== "0x0000000000000000000000000000000000000000" && (
                              <tr>
                                <td className="font-semibold">当前最高出价者</td>
                                <td>{truncateAddress(auction.highestBidder)}</td>
                              </tr>
                            )}
                            <tr>
                              <td className="font-semibold">开始时间</td>
                              <td>{formatTimestamp(Number(auction.startTime))}</td>
                            </tr>
                            <tr>
                              <td className="font-semibold">结束时间</td>
                              <td>{formatTimestamp(Number(auction.endTime))}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      
                      {/* 参与者列表 */}
                      {auctionBidders.length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-semibold mb-2">参与者列表</h4>
                          <div className="overflow-x-auto">
                            <table className="table w-full">
                              <thead>
                                <tr>
                                  <th>序号</th>
                                  <th>参与者地址</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getCurrentAuctionBidders().map((bidder, index) => (
                                  <tr key={index}>
                                    <td>{index + 1 + (auctionPage - 1) * itemsPerPage}</td>
                                    <td>{bidder}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          {/* 分页控件 */}
                          <div className="flex justify-center mt-4">
                            <Pagination
                              currentPage={auctionPage}
                              totalItems={auctionBidders.length}
                              itemsPerPage={itemsPerPage}
                              onPageChange={setAuctionPage}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 鉴定模态框 */}
      <div id="accreditation-modal" className="modal" ref={modalRef}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">鉴定 拍品 #{tokenId}</h3>
          <div className="py-4">
            <textarea
              className="textarea textarea-bordered w-full mb-4"
              placeholder="请输入鉴定描述"
              value={accreditationMessage}
              onChange={(e) => {
                setAccreditationMessage(e.target.value);
                // 当用户开始输入时，标记为编辑状态
                if (!isEditing) setIsEditing(true);
              }}
              rows={4}
            ></textarea>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                handleFileChange(e);
                // 当用户选择文件时，标记为编辑状态
                if (!isEditing) setIsEditing(true);
              }}
              className="input input-bordered w-full"
            />
            {files.length > 0 && (
              <div className="mt-2">
                <p className="text-sm">已选择 {files.length} 个文件</p>
              </div>
            )}
          </div>
          <div className="modal-action">
            <button 
              className="btn btn-outline"
              onClick={handleCloseAccreditationModal}
            >
              取消
            </button>
            <button 
              className={`btn btn-primary ${isProcessing ? "loading" : ""}`}
              disabled={!accreditationMessage.trim() || files.length === 0 || isProcessing}
              onClick={performAccreditation}
            >
              {isProcessing ? "鉴定中..." : "提交鉴定"}
            </button>
          </div>
        </div>
      </div>

      {/* 图片预览模态框 */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-screen p-2" onClick={(e) => e.stopPropagation()}>
            <img 
              src={selectedImage} 
              alt="放大查看"
              className="max-w-full max-h-[90vh] object-contain" 
            />
            <button 
              className="absolute top-4 right-4 bg-white text-black rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-200"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NFTDetailPage;
