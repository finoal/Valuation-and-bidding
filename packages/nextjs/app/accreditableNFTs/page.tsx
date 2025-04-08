"use client";

import { useState, useEffect } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract, useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { uploadImageToIPFS, addToIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import axios from "axios";
import { Hash } from "viem";
import { notification } from "~~/utils/scaffold-eth";
import { useRouter } from "next/navigation";

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
        {/* 首页按钮 */}
        <button
          className="btn btn-sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          首页
        </button>
        
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
        
        {/* 尾页按钮 */}
        <button
          className="btn btn-sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          尾页
        </button>
      </div>
      <span className="text-sm text-gray-500">
        第 {currentPage} 页，共 {totalPages} 页
      </span>
    </div>
  );
};

// NFT类型定义 - 更新以匹配合约返回的类型
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

// 鉴定记录类型定义，更新以匹配合约事件
interface AccreditationRecord {
  institution: string;
  message: string; // IPFS链接
  description?: string;
  images?: string[];
  timestamp: number;
}

const AccreditableNFTs = () => {
  const router = useRouter();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [metadata, setMetadata] = useState<Record<string, NFTMetadata>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAccrediting, setIsAccrediting] = useState(false);
  const [accreditationMessage, setAccreditationMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [accreditingTokenId, setAccreditingTokenId] = useState<bigint | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [viewingRecords, setViewingRecords] = useState<{
    tokenId: bigint;
    records: AccreditationRecord[];
  } | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // 每页显示的NFT数量
  const itemsPerPage = 3;

  // 使用useScaffoldReadContract获取可鉴定的NFT
  const { data: accreditableNFTsData, isLoading: isLoadingNFTsData } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "getAccreditableNFTs",
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

  // 使用useScaffoldEventHistory获取所有鉴定记录事件
  const { data: allAccreditationEvents, isLoading: isLoadingEvents } = useScaffoldEventHistory({
    contractName: "YourCollectible",
    eventName: "AccreditationPerformed",
    fromBlock: 0n,
    watch: true,
  });

  // 使用useScaffoldWriteContract进行鉴定操作
  const { writeContractAsync: performAccreditationWrite } = useScaffoldWriteContract("YourCollectible");

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

  // 获取可鉴定的NFT
  const fetchAccreditableNFTs = async () => {
    if (!accreditableNFTsData) return;

    try {
      setLoading(true);
      // 将只读数组转换为可变数组并确保类型匹配
      setNfts(accreditableNFTsData as unknown as NFTItem[]);
      
      // 获取每个NFT的元数据
      for (const nft of accreditableNFTsData) {
        try {
          // 从tokenUri中提取IPFS哈希
          const ipfsHash = nft.tokenUri.replace("https://gateway.pinata.cloud/ipfs/", "");
          const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
          if (!response.ok) throw new Error(`Failed to fetch metadata for token ${nft.tokenId.toString()}`);
          
          const data = await response.json();
          setMetadata(prev => ({
            ...prev,
            [nft.tokenId.toString()]: data
          }));
        } catch (err) {
          console.error(`Error fetching metadata for token ${nft.tokenId.toString()}:`, err);
        }
      }
    } catch (err) {
      console.error("Error fetching accreditable NFTs:", err);
      setError("获取可鉴定拍品失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  // 检查用户是否是鉴定机构
  useEffect(() => {
    if (userData) {
      // userData[2]是isAccrediting
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

  // 查看NFT的鉴定记录，使用区块链事件
  const viewAccreditationRecords = async (nft: NFTItem) => {
    try {
      setLoadingRecords(true);
      
      // 从所有事件中过滤出与当前NFT相关的事件
      const relevantEvents = allAccreditationEvents?.filter(
        event => event.args?.tokenId && event.args.tokenId.toString() === nft.tokenId.toString()
      ) || [];
      
      if (relevantEvents.length === 0) {
        setViewingRecords({
          tokenId: nft.tokenId,
          records: []
        });
        document.getElementById('records-modal')?.classList.add('modal-open');
        setLoadingRecords(false);
        return;
      }
      
      // 获取每条记录的详细信息
      const records = await Promise.all(
        relevantEvents.map(async event => {
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
              institution: event.args?.institution as string || "",
              message: messageUrl,
              description: jsonData.description || "无描述信息",
              images: jsonData.images || [],
              timestamp: Number(event.args?.timestamp || 0)
            };
          } catch (error) {
            console.error("Error fetching accreditation data:", error);
            // 如果无法获取IPFS数据，创建一个基础记录
            return {
              institution: event.args?.institution as string || "",
              message: event.args?.message || "",
              description: "无法加载鉴定详细信息",
              images: [],
              timestamp: Number(event.args?.timestamp || 0)
            };
          }
        })
      );
      
      // 按时间排序（最新的在前）
      const sortedRecords = records.sort((a, b) => b.timestamp - a.timestamp);
      
      // 更新查看记录状态
      setViewingRecords({
        tokenId: nft.tokenId,
        records: sortedRecords as AccreditationRecord[]
      });
      
      // 打开模态框
      document.getElementById('records-modal')?.classList.add('modal-open');
    } catch (error) {
      console.error("Error viewing accreditation records:", error);
      notification.error("获取鉴定记录失败，请稍后再试");
    } finally {
      setLoadingRecords(false);
    }
  };

  // 执行鉴定，与现有代码类似，但确保我们使用正确的IPFS URI格式
  const performAccreditation = async (tokenId: bigint) => {
    if (!address || !isAccrediting) return;
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
      
      // 获取NFT元数据，用于构建更详细的操作描述
      const nftInfo = metadata[tokenId.toString()]; 
      
      // 使用writeContractAsync执行鉴定
      const txHash = await performAccreditationWrite({
        functionName: "performAccreditation",
        args: [tokenId, ipfsUri],
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
      const nftName = nftInfo?.name || `拍品 #${tokenId.toString()}`;
      const opDescription = `发起鉴定 - 拍品ID: ${tokenId.toString()}, 名称: ${nftName}`;
      
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
      
      notification.remove(notificationId);
      notification.success("鉴定成功！您已成功提交鉴定报告。");
      
      // 成功鉴定后，更新本地状态
      // 如果当前正在查看这个NFT的鉴定记录，也更新这些记录
      if (viewingRecords && viewingRecords.tokenId === tokenId) {
        const newRecord: AccreditationRecord = {
          institution: address,
          message: ipfsUri,
          description: accreditationMessage,
          images: imageUrls,
          timestamp: Math.floor(Date.now() / 1000)
        };
        
        setViewingRecords({
          ...viewingRecords,
          records: [newRecord, ...viewingRecords.records]
        });
      }
      
      // 提示费用分配规则
      notification.info("请注意：只有该藏品拍卖成功后，参与鉴定的机构将瓜分拍卖价值的 20%。");
    } catch (err) {
      notification.remove(notificationId);
      console.error("Error performing accreditation:", err);
      notification.error("鉴定失败，请稍后再试");
    } finally {
      setIsProcessing(false);
      setAccreditingTokenId(null);
      setAccreditationMessage("");
      setFiles([]);
    }
  };

  // 当NFT数据加载完成后获取元数据
  useEffect(() => {
    if (accreditableNFTsData) {
      fetchAccreditableNFTs();
    }
  }, [accreditableNFTsData]);

  // 当页面加载时显示加载状态
  useEffect(() => {
    setLoading(isLoadingNFTsData || isLoadingEvents);
  }, [isLoadingNFTsData, isLoadingEvents]);

  // 计算当前页的NFT
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentNFTs = nfts.slice(indexOfFirstItem, indexOfLastItem);

  // 处理页面变化
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    // 保存当前页码到localStorage
    savePageState(pageNumber);
  };

  // 保存页面状态
  const savePageState = (pageNumber: number) => {
    localStorage.setItem("accreditableNFTsPageState", JSON.stringify({
      currentPage: pageNumber,
    }));
  };
  
  // 恢复页面状态
  useEffect(() => {
    const savedState = localStorage.getItem("accreditableNFTsPageState");
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setCurrentPage(state.currentPage || 1);
      } catch (error) {
        console.error("恢复页面状态失败:", error);
      }
    }
  }, []);

  // 截断地址显示
  const truncateAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // 处理详情页跳转
  const handleNavigateToDetail = (tokenId: bigint) => {
    // 保存当前页面状态
    savePageState(currentPage);
    // 使用Next.js路由进行跳转，而不是完全刷新页面
    router.push(`/accreditableNFTs/${tokenId.toString()}`);
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

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-8 text-center">可鉴定的拍品</h1>
      
      {nfts.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-xl">当前没有可鉴定的拍品</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentNFTs.map((nft) => {
              const nftMetadata = metadata[nft.tokenId.toString()];
              
              return (
                <div key={nft.tokenId.toString()} className="card bg-base-100 shadow-xl overflow-hidden">
                  {/* NFT图片 */}
                  <figure className="h-64 relative">
                    {nftMetadata ? (
                      <img 
                        src={nftMetadata.image} 
                        alt={nftMetadata.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-base-200">
                        <p>加载中...</p>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 badge badge-primary">
                      ID: {nft.tokenId.toString()}
                    </div>
                  </figure>
                  
                  <div className="card-body">
                    {/* NFT名称和类型 */}
                    <h2 className="card-title">
                      {nftMetadata ? nftMetadata.name : `拍品 #${nft.tokenId.toString()}`}
                      {nft.isAccredited && (
                        <div className="badge badge-secondary">可鉴定</div>
                      )}
                    </h2>
                    
                    {nftMetadata && (
                      <p className="text-sm text-gray-500">{nftMetadata.kind}</p>
                    )}
                    
                    {/* 鉴定信息 */}
                    <div className="mt-2">
                      <p className="text-sm">
                        <span className="font-semibold">已鉴定次数:</span> {nft.accreditedCount.toString()}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">发起者:</span> {truncateAddress(nft.seller)}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">鉴定机构数:</span> {nft.accreditedInstitutions.length}
                      </p>
                    </div>
                    
                    {/* 鉴定机构列表 */}
                    {/* {nft.accreditedInstitutions.length > 0 && (
                      <div className="mt-2">
                        <p className="font-semibold text-sm">鉴定机构:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {nft.accreditedInstitutions.slice(0, 3).map((institution, index) => (
                            <span key={index} className="badge badge-outline text-xs">
                              {truncateAddress(institution)}
                            </span>
                          ))}
                          {nft.accreditedInstitutions.length > 3 && (
                            <span className="badge badge-outline text-xs">
                              +{nft.accreditedInstitutions.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )} */}
                    
                    {/* 操作按钮 */}
                    <div className="card-actions justify-between mt-4">
                      <button 
                        onClick={() => handleNavigateToDetail(nft.tokenId)}
                        className="btn btn-sm btn-outline"
                      >
                        查看详情
                      </button>
                      
                      <div className="flex gap-2">
                        {nft.accreditedInstitutions.length > 0 && (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => viewAccreditationRecords(nft)}
                          >
                            查看鉴定
                          </button>
                        )}
                        
                        {isAccrediting && (
                          <button 
                            className="btn btn-sm btn-primary"
                            onClick={() => {
                              setAccreditingTokenId(nft.tokenId);
                              document.getElementById('accreditation-modal')?.classList.add('modal-open');
                            }}
                          >
                            鉴定
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* 分页控件 */}
          <div className="flex justify-center mt-8">
            <Pagination
              currentPage={currentPage}
              totalItems={nfts.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      )}
      
      {/* 鉴定记录查看模态框 */}
      <div id="records-modal" className="modal">
        <div className="modal-box max-w-3xl">
          <h3 className="font-bold text-lg">鉴定记录 - 拍品 #{viewingRecords?.tokenId?.toString()}</h3>
          <div className="py-4">
            {loadingRecords ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : viewingRecords && viewingRecords.records.length > 0 ? (
              <div className="space-y-6">
                {viewingRecords.records.map((record, index) => (
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
            ) : (
              <div className="text-center py-6">
                <p>暂无鉴定记录</p>
              </div>
            )}
          </div>
          <div className="modal-action">
            <button 
              className="btn btn-outline"
              onClick={() => {
                document.getElementById('records-modal')?.classList.remove('modal-open');
                setViewingRecords(null);
              }}
            >
              关闭
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
      
      {/* 鉴定模态框 */}
      <div id="accreditation-modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">鉴定 拍品 #{accreditingTokenId?.toString()}</h3>
          <div className="py-4">
            <textarea
              className="textarea textarea-bordered w-full mb-4"
              placeholder="请输入鉴定描述"
              value={accreditationMessage}
              onChange={(e) => setAccreditationMessage(e.target.value)}
              rows={4}
            ></textarea>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
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
              onClick={() => {
                document.getElementById('accreditation-modal')?.classList.remove('modal-open');
                setAccreditingTokenId(null);
                setAccreditationMessage("");
                setFiles([]);
              }}
            >
              取消
            </button>
            <button 
              className={`btn btn-primary ${isProcessing ? "loading" : ""}`}
              disabled={!accreditationMessage.trim() || files.length === 0 || isProcessing}
              onClick={() => {
                document.getElementById('accreditation-modal')?.classList.remove('modal-open');
                if (accreditingTokenId !== null) {
                  performAccreditation(accreditingTokenId);
                }
              }}
            >
              {isProcessing ? "鉴定中..." : "提交鉴定"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccreditableNFTs; 