"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

const Transfers: NextPage = () => {
  // 添加状态来跟踪当前选中的记录类型
  const [activeTab, setActiveTab] = useState<'all' | 'royalty'>('all');

  const { data: transferEvents, isLoading } = useScaffoldEventHistory({
    contractName: "YourCollectible",
    eventName: "TransactionRecord",
    // Specify the starting block number from which to read events, this is a bigint.
    fromBlock: 0n,
  });
  console.log("222", transferEvents);

  // 筛选版税记录
  const royaltyRecords = transferEvents?.filter(event => 
    event.args.transactionType === "RoyaltyPayment"
  ) || [];

  // 根据当前选中的标签确定显示的记录
  const displayRecords = activeTab === 'all' ? transferEvents : royaltyRecords;

  if (isLoading)
    return (
      <div className="flex justify-center items-center mt-10">
        <span className="loading loading-spinner loading-xl"></span>
      </div>
    );

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">交易历史记录</span>
          </h1>
        </div>

        {/* 添加选项卡 */}
        <div className="tabs tabs-boxed mb-4">
          <a 
            className={`tab ${activeTab === 'all' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            所有交易
          </a>
          <a 
            className={`tab ${activeTab === 'royalty' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('royalty')}
          >
            版税记录
          </a>
        </div>

        <div className="overflow-x-auto shadow-lg">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th className="bg-primary">交易序号</th>
                <th className="bg-primary">交易时间</th>
                <th className="bg-primary">类型</th>
                <th className="bg-primary">{activeTab === 'royalty' ? '原创者' : '发送者'}</th>
                <th className="bg-primary">{activeTab === 'royalty' ? '支付者' : '接收者'}</th>
                <th className="bg-primary">金额 (ETH)</th>
              </tr>
            </thead>
            <tbody>
              {!displayRecords || displayRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center">
                    {activeTab === 'royalty' ? '没有版税记录' : '没有交易记录'}
                  </td>
                </tr>
              ) : (
                displayRecords?.map((event, index) => {
                  return (
                    <tr key={index}>
                      <th className="text-center">{event.args.transactionId?.toString()}</th>
                      <td className="text-center">{new Date(Number(event.args.timestamp) * 1000).toLocaleString()}</td>
                      <td className="text-center">{event.args.transactionType}</td>
                      <td>
                        <Address address={event.args.from} />
                      </td>
                      <td>
                        <Address address={event.args.to} />
                      </td>
                      <th className="text-center">{(Number(event.args.amount) / 1e18).toFixed(4)} ETH</th>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 显示版税说明 */}
        {activeTab === 'royalty' && (
          <div className="mt-4 p-4 bg-base-200 rounded-lg shadow">
            <h3 className="font-bold text-lg mb-2">版税说明</h3>
            <p>版税是指拍品原创者在拍品每次转售时获得的一定比例的收入。</p>
            <p>在本系统中，当拍品被转售时，智能合约会自动从交易金额中提取预设的版税比例，直接支付给原创者。</p>
            <p>这种机制保护了创作者的权益，确保他们能够从作品的增值中获益。</p>
          </div>
        )}
      </div>
    </>
  );
};

export default Transfers;
