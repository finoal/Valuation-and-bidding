"use client";

import { useState, useEffect } from "react";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory, useScaffoldReadContract} from "~~/hooks/scaffold-eth";

const NFTMessage = () => {
 

  const [nftData] = useState(() => {

    if (typeof window !== 'undefined') {
      const selectedNft = localStorage.getItem("selectedNft");
      return selectedNft ? JSON.parse(selectedNft) : null;
    }


    return null;
  });

  const {
    data: auction,
  } = useScaffoldReadContract({
    contractName:"YourCollectible",
    functionName:"getAuction",
    args:[BigInt(nftData.tokenId.toString())]
  });

  const [auctionRecords, setAuctionRecords] = useState<any[]>([]);
  const [parsedAccreditationData, setParsedAccreditationData] = useState<any[]>([]);
  const [accreditationPage, setAccreditationPage] = useState(1);
  const [auctionPage, setAuctionPage] = useState(1);

  const ITEMS_PER_PAGE = 1;
  const ACCREDITATION_PER_PAGE = 1;

  const {
    data: bidEvents,
    isLoading: isLoadingBidEvents,
    error: errorReadingBidEvents,
  } = useScaffoldEventHistory({
    contractName: "YourCollectible",
    eventName: "NewBid",
    fromBlock: 0n,
    watch: true,
  });

  const {
    data: accreditationEvents,
    isLoading: isLoadingAccreditationEvents,
  } = useScaffoldEventHistory({
    contractName: "YourCollectible",
    eventName: "AccreditationPerformed",// getAuction
    fromBlock: 0n,
    watch: true,
  });


  
  // 添加数据加载完成的状态
  const [accreditationDataLoaded, setAccreditationDataLoaded] = useState(false);
  const [auctionDataLoaded, setAuctionDataLoaded] = useState(false);

  useEffect(() => {
    if (bidEvents && nftData?.tokenId) {
      const filteredBidEvents = bidEvents.filter(event => 
        event.args.tokenId.toString() === nftData.tokenId.toString()
      );
      
      const formattedBidRecords = filteredBidEvents
        .map(event => ({
          bidder: event.args.bidder,
          bid: `${Number(event.args.amount) / 1e18} ETH`,
          timestamp: Number(event.args.timestamp),
          displayTime: new Date(Number(event.args.timestamp) * 1000).toLocaleString(),
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      setAuctionRecords(formattedBidRecords);
      setAuctionDataLoaded(true);
    }
  }, [bidEvents, nftData?.tokenId]);

  useEffect(() => {
    let mounted = true;

    const loadAccreditationData = async () => {
      if (accreditationEvents && nftData?.tokenId) {
        const filteredAccreditationEvents = accreditationEvents.filter(event => 
          event.args.tokenId.toString() === nftData.tokenId.toString()
        );
        
        try {
          const results = await Promise.all(
            filteredAccreditationEvents.map(async event => {
              try {
                const response = await fetch(event.args.message);
                const jsonData = await response.json();
                
                return {
                  institution: event.args.institution,
                  description: jsonData.description,
                  images: jsonData.images,
                  timestamp: Number(event.args.timestamp),
                  displayTime: new Date(Number(event.args.timestamp) * 1000).toLocaleString(),
                };
              } catch (error) {
                console.error("Error fetching accreditation data:", error);
                return null;
              }
            })
          );

          if (mounted) {
            const validResults = results
              .filter(result => result !== null)
              .sort((a, b) => b!.timestamp - a!.timestamp);
            setParsedAccreditationData(validResults);
            setAccreditationDataLoaded(true);
          }
        } catch (error) {
          console.error("Error loading accreditation data:", error);
        }
      }
    };

    loadAccreditationData();
    return () => {
      mounted = false;
    };
  }, [accreditationEvents, nftData?.tokenId]);

  const paginatedAccreditationRecords = parsedAccreditationData.slice(
    (accreditationPage - 1) * ACCREDITATION_PER_PAGE,
    accreditationPage * ACCREDITATION_PER_PAGE
  );

  const paginatedAuctionRecords = auctionRecords.slice(
    (auctionPage - 1) * ITEMS_PER_PAGE,
    auctionPage * ITEMS_PER_PAGE
  );

  // 修改右侧鉴定记录的展示部分
  const renderAccreditationSection = () => (
    <>
      <h3 className="text-2xl font-semibold mb-4">鉴定记录</h3>
      <div className="mb-6">
        {!accreditationDataLoaded || isLoadingAccreditationEvents ? (
          <div className="flex justify-center items-center py-4">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        ) : paginatedAccreditationRecords.length > 0 ? (
          <ul className="space-y-8">
            {paginatedAccreditationRecords.map((record, index) => (
              <li key={index} className="border-b pb-6">
                <div className="mb-4">
                  <p className="font-semibold mb-2">鉴定机构: <Address address={record.institution} /></p>
                  <p className="mb-2">鉴定意见: {record.description}</p>
                  <p className="mb-4">时间: {record.displayTime}</p>
                </div>
                
                {record.images && record.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 w-1/2 mx-auto">
                    {record.images.map((image: string, imgIndex: number) => (
                      <div key={imgIndex} className="relative aspect-square">
                        <img 
                          src={image} 
                          alt={`鉴定图片 ${imgIndex + 1}`} 
                          className="rounded-lg object-cover w-full h-full"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 text-center py-4">暂无鉴定记录</p>
        )}
      </div>

      <div className="flex justify-center mb-8">
        <button 
          className="btn btn-secondary" 
          onClick={() => setAccreditationPage(prev => prev - 1)} 
          disabled={accreditationPage === 1}
        >
          上一页
        </button>
        <span className="mx-4 flex items-center">
          第 {accreditationPage} / {Math.max(1, Math.ceil(parsedAccreditationData.length / ACCREDITATION_PER_PAGE))} 页
        </span>
        <button 
          className="btn btn-secondary" 
          onClick={() => setAccreditationPage(prev => prev + 1)} 
          disabled={accreditationPage >= Math.ceil(parsedAccreditationData.length / ACCREDITATION_PER_PAGE)}
        >
          下一页
        </button>
      </div>
    </>
  );

  // 修改右侧竞拍记录的展示部分
  const renderAuctionSection = () => (
    <>
      <h3 className="text-2xl font-semibold mb-4">竞拍记录</h3>
      <div className="mb-6">
        {!auctionDataLoaded || isLoadingBidEvents ? (
          <div className="flex justify-center items-center py-4">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        ) : paginatedAuctionRecords.length > 0 ? (
          <ul className="space-y-4">
            {paginatedAuctionRecords.map((record, index) => (
              <li key={index} className="border-b pb-4">
                <p className="font-semibold">出价者: <Address address={record.bidder} /></p>
                <p>出价金额: {record.bid}</p>
                <p>时间: {record.displayTime}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 text-center py-4">暂无竞拍记录</p>
        )}
      </div>

      <div className="flex justify-center">
        <button 
          className="btn btn-secondary" 
          onClick={() => setAuctionPage(prev => prev - 1)} 
          disabled={auctionPage === 1}
        >
          上一页
        </button>
        <span className="mx-4 flex items-center">
          第 {auctionPage} / {Math.max(1, Math.ceil(auctionRecords.length / ITEMS_PER_PAGE))} 页
        </span>
        <button 
          className="btn btn-secondary" 
          onClick={() => setAuctionPage(prev => prev + 1)} 
          disabled={auctionPage >= Math.ceil(auctionRecords.length / ITEMS_PER_PAGE)}
        >
          下一页
        </button>
      </div>
    </>
  );

  if (!nftData) {
    return null;
  }

  if (errorReadingBidEvents) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-500">加载出价记录时出错: {errorReadingBidEvents?.message || '未知错误'}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">NFT 详情</h1>
        <button className="btn btn-primary" onClick={() => window.history.back()}>
          返回
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex flex-col items-center">
            <img src={nftData.image} alt="NFT Image" className="w-64 h-64 object-cover rounded-lg mb-4" />
            <div className="w-4/5 mx-auto">
              <div className="grid grid-cols-4 gap-4 mb-2">
                <span className="text-lg font-semibold text-right col-span-1">拍品名称：</span>
                <span className="text-lg col-span-3">{nftData.name || "未命名"}</span>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mb-2">
                <span className="text-lg font-semibold text-right col-span-1">拍品描述：</span>
                <span className="text-lg col-span-3">{nftData.description || "无描述"}</span>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mb-2">
                <span className="text-lg font-semibold text-right col-span-1">被鉴定次数：</span>
                <span className="text-lg col-span-3">{nftData.accreditedCount}</span>
              </div>
              
              {auction?.isActive ? (
                <div className="grid grid-cols-4 gap-4 mb-2">
                  <span className="text-lg font-semibold text-right col-span-1">竞拍次数：</span>
                  <span className="text-lg col-span-3">{Number(auction?.bidCount)}</span>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4 mb-2">
                  <span className="text-lg font-semibold text-right col-span-1">竞拍状态：</span>
                  <span className="text-lg col-span-3 text-red-500">竞拍尚未开始</span>
                </div>
              )}
              
              <div className="grid grid-cols-4 gap-4 mb-2">
                <span className="text-lg font-semibold text-right col-span-1">起拍价：</span>
                <span className="text-lg col-span-3">
                  {isNaN(Number(auction?.startPrice) / 1e18) ? "未设置" : `${Number(auction?.startPrice) / 1e18} ETH`}
                </span>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mb-2">
                <span className="text-lg font-semibold text-right col-span-1">当前出价：</span>
                <span className="text-lg col-span-3">
                  {isNaN(Number(auction?.highestBid) / 1e18) ? "未开始竞拍" : `${Number(auction?.highestBid) / 1e18} ETH`}
                </span>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mb-2">
                <span className="text-lg font-semibold text-right col-span-1">最高出价者：</span>
                <span className="text-lg col-span-3">
                  {auction?.highestBidder ? <Address address={auction?.highestBidder} /> : "未开始竞拍"}
                </span>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mb-2">
                <span className="text-lg font-semibold text-right col-span-1">所有人：</span>
                <span className="text-lg col-span-3">
                  <Address address={nftData.owner} />
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-6">
          {renderAccreditationSection()}
          {renderAuctionSection()}
        </div>
      </div>
    </div>
  );
};

export default NFTMessage;
