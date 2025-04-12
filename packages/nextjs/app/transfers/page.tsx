"use client";

import { useState, useEffect } from "react";
import type { NextPage } from "next";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

const Transfers: NextPage = () => {
  // 添加状态来跟踪当前选中的记录类型
  const [activeTab, setActiveTab] = useState<'all' | 'royalty'>('all');
  // 添加排序状态
  const [sortField, setSortField] = useState<'timestamp' | 'amount'>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // 添加分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const { data: transferEvents, isLoading } = useScaffoldEventHistory({
    contractName: "YourCollectible",
    eventName: "TransactionRecord",
    // Specify the starting block number from which to read events, this is a bigint.
    fromBlock: 0n,
  });

  // 筛选版税记录
  const royaltyRecords = transferEvents?.filter(event => 
    event.args.transactionType === "RoyaltyPayment"
  ) || [];

  // 根据当前选中的标签确定显示的记录
  const unfilteredRecords = activeTab === 'all' ? transferEvents : royaltyRecords;

  // 排序记录
  const sortedRecords = [...(unfilteredRecords || [])].sort((a, b) => {
    if (sortField === 'timestamp') {
      const timeA = Number(a.args.timestamp);
      const timeB = Number(b.args.timestamp);
      return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
    } else {
      const amountA = Number(a.args.amount);
      const amountB = Number(b.args.amount);
      return sortDirection === 'asc' ? amountA - amountB : amountB - amountA;
    }
  });

  // 计算分页
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedRecords.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage);

  // 更改排序字段
  const handleSortChange = (field: 'timestamp' | 'amount') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // 分页导航
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // 在记录数量变化或切换标签时重置为第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, transferEvents?.length]);

  if (isLoading)
    return (
      <div className="flex justify-center items-center mt-10">
        <span className="loading loading-spinner loading-xl"></span>
      </div>
    );

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5 w-full max-w-5xl">
          <h1 className="text-center mb-6">
            <span className="block text-4xl font-bold">交易历史记录</span>
          </h1>

          {/* 添加选项卡 */}
          <div className="tabs tabs-boxed mb-6 justify-center">
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

          {/* 排序控件 */}
          <div className="flex justify-end mb-4">
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-sm btn-outline btn-primary m-1">
                排序方式 {sortField === 'timestamp' ? '(时间)' : '(金额)'} 
                {sortDirection === 'asc' ? '↑' : '↓'}
              </label>
              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                <li><a onClick={() => handleSortChange('timestamp')}>按时间排序 {sortField === 'timestamp' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</a></li>
                <li><a onClick={() => handleSortChange('amount')}>按金额排序 {sortField === 'amount' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}</a></li>
              </ul>
            </div>
          </div>

          <div className="overflow-x-auto shadow-lg rounded-box">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th className="bg-primary text-primary-content">交易序号</th>
                  <th className="bg-primary text-primary-content cursor-pointer" onClick={() => handleSortChange('timestamp')}>
                    交易时间 {sortField === 'timestamp' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="bg-primary text-primary-content">类型</th>
                  <th className="bg-primary text-primary-content">{activeTab === 'royalty' ? '原创者' : '发送者'}</th>
                  <th className="bg-primary text-primary-content">{activeTab === 'royalty' ? '支付者' : '接收者'}</th>
                  <th className="bg-primary text-primary-content cursor-pointer" onClick={() => handleSortChange('amount')}>
                    金额 (ETH) {sortField === 'amount' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {!currentItems || currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      {activeTab === 'royalty' ? '没有版税记录' : '没有交易记录'}
                    </td>
                  </tr>
                ) : (
                  currentItems.map((event, index) => {
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

          {/* 分页控件 */}
          {sortedRecords.length > 0 && (
            <div className="flex justify-center mt-6">
              <div className="btn-group">
                <button 
                  className="btn btn-sm btn-outline" 
                  onClick={() => paginate(1)} 
                  disabled={currentPage === 1}
                >
                  首页
                </button>
                <button 
                  className="btn btn-sm btn-outline" 
                  onClick={() => paginate(currentPage - 1)} 
                  disabled={currentPage === 1}
                >
                  上一页
                </button>
                <button className="btn btn-sm btn-outline btn-active">
                  {currentPage} / {totalPages}
                </button>
                <button 
                  className="btn btn-sm btn-outline" 
                  onClick={() => paginate(currentPage + 1)} 
                  disabled={currentPage === totalPages}
                >
                  下一页
                </button>
                <button 
                  className="btn btn-sm btn-outline" 
                  onClick={() => paginate(totalPages)} 
                  disabled={currentPage === totalPages}
                >
                  尾页
                </button>
              </div>
            </div>
          )}

          {/* 页面信息 */}
          {sortedRecords.length > 0 && (
            <div className="text-sm text-center mt-2">
              显示 {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, sortedRecords.length)} 条，共 {sortedRecords.length} 条记录
            </div>
          )}

          {/* 显示版税说明 */}
          {activeTab === 'royalty' && (
            <div className="mt-6 p-5 bg-base-200 rounded-box shadow">
              <h3 className="font-bold text-lg mb-3">版税说明</h3>
              <p className="mb-2">版税是指拍品原创者在拍品每次转售时获得的一定比例的收入。</p>
              <p className="mb-2">在本系统中，当拍品被转售时，智能合约会自动从交易金额中提取预设的版税比例，直接支付给原创者。</p>
              <p>这种机制保护了创作者的权益，确保他们能够从作品的增值中获益。</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Transfers;
