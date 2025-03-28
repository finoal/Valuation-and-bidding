"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";

// 分页组件
const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (pageNumber: number) => void; 
}) => {
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

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <div className="btn-group">
        {/* 首页按钮 */}
        <button
          className="btn btn-sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="首页"
        >
          «« 
        </button>
        
        {/* 上一页按钮 */}
        <button
          className="btn btn-sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="上一页"
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
          title="下一页"
        >
          »
        </button>
        
        {/* 尾页按钮 */}
        <button
          className="btn btn-sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="尾页"
        >
          »»
        </button>
      </div>
      <span className="text-sm text-gray-500">
        第 {currentPage} 页，共 {totalPages} 页
      </span>
    </div>
  );
};

// 交易记录类型定义
interface Transaction {
  id: number;
  block_number: string;
  block_timestamp: string;
  transaction_hash: string;
  from_address: string;
  to_address: string;
  gas: string;
  status: string;
  operation_description: string;
  created_at: string;
}

// 交易记录列表页面
const TransactionsPage = () => {
  const { address } = useAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  const [viewMode, setViewMode] = useState<"all" | "mine">("all");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  // 是否显示完整地址
  const [showFullAddress, setShowFullAddress] = useState(false);
  // 排序方式
  const [sortField, setSortField] = useState<"block_number" | "block_timestamp">("block_timestamp");
  // 排序顺序 (desc: 降序, asc: 升序)
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // 截断地址显示
  const truncateAddress = (address: string) => {
    if (showFullAddress) {
      return address; // 显示完整地址
    }
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // 格式化时间
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // 获取交易记录
  const fetchTransactions = async (page: number) => {
    setLoading(true);
    try {
      let url;
      if (viewMode === "all") {
        // 添加排序参数到URL
        url = `http://localhost:3001/getRecentTransactions?page=${page}&pageSize=${pageSize}&sortField=${sortField}&sortOrder=${sortOrder}`;
      } else if (viewMode === "mine" && address) {
        // 添加排序参数到URL
        url = `http://localhost:3001/getTransactionsByAddress/${address}?sortField=${sortField}&sortOrder=${sortOrder}`;
      } else {
        setTransactions([]);
        setLoading(false);
        return;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`获取交易记录失败: ${response.statusText}`);
      }

      const data = await response.json();
      
      let transactions;
      if (viewMode === "all") {
        transactions = data.data;
        setTotalPages(data.pagination.totalPages);
      } else {
        // 对于我的交易，手动处理分页
        transactions = data;
        setTotalPages(Math.ceil(data.length / pageSize));
      }
      
      // 设置交易记录
      setTransactions(transactions);
    } catch (err) {
      console.error("获取交易记录失败:", err);
      setError("获取交易记录失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  // 获取排序图标
  const getSortIcon = (field: "block_number" | "block_timestamp") => {
    if (field !== sortField) return "↕️"; // 默认图标
    return sortOrder === 'desc' ? "↓" : "↑"; // 降序或升序图标
  };

  // 处理页面切换
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  // 处理排序切换
  const handleSort = (field: "block_number" | "block_timestamp") => {
    if (field === sortField) {
      // 如果点击的是当前排序字段，则切换排序顺序
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      // 如果点击的是不同字段，则切换字段并默认为降序
      setSortField(field);
      setSortOrder('desc');
    }
    
    // 不在这里进行本地排序，而是触发重新获取数据
    // 当sortField或sortOrder变化时，useEffect会触发fetchTransactions
  };

  // 监听页码、查看模式、排序方式和排序顺序的变化
  useEffect(() => {
    fetchTransactions(currentPage);
  }, [currentPage, viewMode, address, sortField, sortOrder]);

  // 获取当前页数据
  const getCurrentPageData = () => {
    if (viewMode === "all") {
      return transactions;
    } else {
      // 手动计算当前页数据
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize;
      return transactions.slice(start, end);
    }
  };

  // 处理查看交易详情
  const handleViewTransaction = (tx: Transaction) => {
    setSelectedTransaction(tx);
    document.getElementById('transaction-modal')?.classList.add('modal-open');
  };

  // 关闭交易详情模态框
  const closeTransactionModal = () => {
    setSelectedTransaction(null);
    document.getElementById('transaction-modal')?.classList.remove('modal-open');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">区块链交易记录</h1>
      
      {/* 视图切换按钮 */}
      <div className="flex justify-between mb-6">
        <div className="tabs tabs-boxed">
          <a 
            className={`tab ${viewMode === 'all' ? 'tab-active' : ''}`}
            onClick={() => setViewMode('all')}
          >
            所有交易
          </a>
          <a 
            className={`tab ${viewMode === 'mine' ? 'tab-active' : ''}`}
            onClick={() => {
              if (address) {
                setViewMode('mine');
              } else {
                alert("请先连接钱包");
              }
            }}
          >
            我的交易
          </a>
        </div>

        <div className="flex items-center gap-4">
          <div className="form-control">
            <label className="label cursor-pointer flex gap-2">
              <span className="label-text">{showFullAddress ? "显示完整地址" : "显示简短地址"}</span>
              <input 
                type="checkbox" 
                className="toggle toggle-primary"
                checked={showFullAddress}
                onChange={() => setShowFullAddress(!showFullAddress)}
              />
            </label>
          </div>
          <Link href="/" className="btn btn-sm btn-outline">
            返回首页
          </Link>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-error text-error-content p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* 加载状态 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 bg-base-200 rounded-lg">
          <p className="text-xl font-semibold">暂无交易记录</p>
          {viewMode === "mine" && !address && (
            <p className="mt-2">请先连接钱包</p>
          )}
        </div>
      ) : (
        <>
          {/* 交易记录列表 */}
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th 
                    className="hidden lg:table-cell w-1/12 cursor-pointer"
                    onClick={() => handleSort("block_number")}
                  >
                    区块高度 {getSortIcon("block_number")}
                  </th>
                  <th 
                    className="w-1/6 cursor-pointer"
                    onClick={() => handleSort("block_timestamp")}
                  >
                    时间 {getSortIcon("block_timestamp")}
                  </th>
                  <th className="w-1/4">发送方</th>
                  <th className="w-1/4">接收方</th>
                  <th className="hidden md:table-cell w-1/12">状态</th>
                  <th className="w-1/12">操作</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentPageData().map((tx) => (
                  <tr key={tx.id} className="hover">
                    <td className="hidden lg:table-cell">{tx.block_number}</td>
                    <td>{formatDate(tx.block_timestamp)}</td>
                    <td className="max-w-xs">
                      <div className="text-xs md:text-sm font-mono break-all overflow-hidden">
                        {truncateAddress(tx.from_address)}
                      </div>
                    </td>
                    <td className="max-w-xs">
                      <div className="text-xs md:text-sm font-mono break-all overflow-hidden">
                        {truncateAddress(tx.to_address)}
                      </div>
                    </td>
                    <td className="hidden md:table-cell">
                      <span className={`badge ${tx.status === 'success' ? 'badge-success' : tx.status === 'pending' ? 'badge-warning' : 'badge-error'}`}>
                        {tx.status === 'success' ? '成功' : tx.status === 'pending' ? '处理中' : '失败'}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-xs btn-outline"
                        onClick={() => handleViewTransaction(tx)}
                      >
                        详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页控件 */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* 交易详情模态框 */}
      <div id="transaction-modal" className="modal">
        <div className="modal-box max-w-3xl">
          {selectedTransaction && (
            <>
              <h3 className="font-bold text-lg mb-4">交易详情</h3>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <tbody>
                    <tr>
                      <td className="font-semibold">交易哈希</td>
                      <td className="text-xs md:text-sm font-mono break-all">{selectedTransaction.transaction_hash}</td>
                    </tr>
                    <tr>
                      <td className="font-semibold">区块高度</td>
                      <td>{selectedTransaction.block_number}</td>
                    </tr>
                    <tr>
                      <td className="font-semibold">时间戳</td>
                      <td>{formatDate(selectedTransaction.block_timestamp)}</td>
                    </tr>
                    <tr>
                      <td className="font-semibold">发送方</td>
                      <td className="text-xs md:text-sm font-mono break-all">{selectedTransaction.from_address}</td>
                    </tr>
                    <tr>
                      <td className="font-semibold">接收方</td>
                      <td className="text-xs md:text-sm font-mono break-all">{selectedTransaction.to_address}</td>
                    </tr>
                    <tr>
                      <td className="font-semibold">Gas</td>
                      <td>{selectedTransaction.gas}</td>
                    </tr>
                    <tr>
                      <td className="font-semibold">状态</td>
                      <td>
                        <span className={`badge ${selectedTransaction.status === 'success' ? 'badge-success' : selectedTransaction.status === 'pending' ? 'badge-warning' : 'badge-error'}`}>
                          {selectedTransaction.status === 'success' ? '成功' : selectedTransaction.status === 'pending' ? '处理中' : '失败'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="font-semibold">操作描述</td>
                      <td>{selectedTransaction.operation_description}</td>
                    </tr>
                    <tr>
                      <td className="font-semibold">创建时间</td>
                      <td>{formatDate(selectedTransaction.created_at)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="modal-action">
            <button 
              className="btn"
              onClick={closeTransactionModal}
            >
              关闭
            </button>
            {selectedTransaction && (
              <a 
                href={`https://sepolia.etherscan.io/tx/${selectedTransaction.transaction_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                在区块浏览器中查看
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage; 