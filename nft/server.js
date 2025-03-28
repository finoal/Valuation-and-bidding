const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3001;
const pool = mysql.createPool({
    host:'localhost',
    user:'root',
    password:'root',
    database:'nft'
});

app.use(cors());
app.use(bodyParser.json());  // 解析 JSON 格式请求体
app.use(bodyParser.urlencoded({ extended: true }));  // 解析 urlencoded 请求体

//保存对应的拍品信息address to, string memory uri, uint96 royaltyFeeNumber)
app.post('/saveNft',(req, res) =>{
    const { tokenId, category, owner,creater, royalty, cid, status, lease, price, created_at } = req.body;
    console.log(req.body);
    // 格式化时间为 MySQL 可接受的格式
    // 转换为 "YYYY-MM-DD HH:MM:SS"
    const query = 'INSERT INTO nfts (tokenId, kind, owner, creater, img, royalty, status, lease, price, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    pool.execute(query, [tokenId, category, owner, creater, cid, royalty, status, lease, price, created_at],(err, result)=>{
        if(err){
            console.error('Failed to save NFT:',err);
            return res.status(500).json({ error:"Failed to save NFT" });
        }
        res.status(200).json({ message: 'NfT saved successfully', nftId: result.insertId });
    });
});

//通过用户地址获取对应的拍品
app.post('/getNFTbyAddress', (req, res) => {
    console.log('Received request:', req.body); // 检查请求体是否为空
    const { owner } = req.body;
    if (!owner) {
        return res.status(400).json({ error: 'Owner address is required' });
    }
    console.log('Owner:', owner);

    const query = 'SELECT * FROM nfts WHERE `owner` = ?';
    pool.query(query, [owner], (error, results) => {
        if (error) {
            console.error('获取 NFT 列表失败:', error);
            return res.status(500).json({ error: '获取 NFT 列表失败' });
        }
        res.json(results);
    });
});

// 1. 添加拍卖信息
app.post('/addAuction', (req, res) => {
    const {
        tokenId,
        uri,
        seller,
        startPrice,
        highestBid,
        highestBidder,
        endTime,
        isActive,
        isRoyalty,
        num,
        bidCount
    } = req.body;

    console.log("拍卖信息", req.body);
    const query = `
        INSERT INTO auctions (
            token_id, uri, seller, start_price, highest_bid, highest_bidder, 
            end_time, is_active, is_royalty, num, bid_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    pool.execute(query, [
        tokenId, uri, seller, startPrice, highestBid, highestBidder,
        endTime, isActive, isRoyalty, num, bidCount
    ], (err, result) => {
        if (err) {
            console.error('Failed to add auction:', err);
            return res.status(500).json({ error: "Failed to add auction" });
        }
        console.log("添加拍卖信息成功");
        res.status(200).json({ message: 'Auction added successfully', auctionId: result.insertId });
    });
});

// 2. 获取所有拍卖信息
app.get('/getAuctions', (req, res) => {
    const query = 'SELECT * FROM auctions';
    pool.query(query, (error, results) => {
        if (error) {
            console.error('Failed to get auctions:', error);
            return res.status(500).json({ error: 'Failed to get auctions' });
        }
        res.json(results);
        console.log("获取所有拍卖信息成功");
    });
});

// 3. 添加竞价信息
app.post('/addBid', (req, res) => {
    const { auctionId, bidder, bidAmount } = req.body;

    const query = `
        INSERT INTO bids (auction_id, bidder, bid_amount, bid_time)
        VALUES (?, ?, ?, NOW())
    `;

    pool.execute(query, [auctionId, bidder, bidAmount], (err, result) => {
        if (err) {
            console.error('Failed to add bid:', err);
            return res.status(500).json({ error: "Failed to add bid" });
        }
        console.log("添加竞价信息成功");
        res.status(200).json({ message: 'Bid added successfully', bidId: result.insertId });
    });
});

// 4. 获取拍卖的竞价信息
app.get('/getBids/:auctionId', (req, res) => {
    const auctionId = parseInt(req.params.auctionId);
    const query = 'SELECT * FROM bids WHERE auction_id = ? ORDER BY bid_time DESC';
    pool.query(query, [auctionId], (error, results) => {
        if (error) {
            console.error('Failed to get bids:', error);
            return res.status(500).json({ error: 'Failed to get bids' });
        }
        res.json(results);
        console.log("获取拍卖的竞价信息");
    });
});

// 5. 添加用户信息
app.post('/addUser', (req, res) => {
    const {
        name,
        password,
        wallet,
        bio,
        isAccrediting,
        integral,
        assessUri
    } = req.body;

    const query = `
        INSERT INTO users (
            name, password, wallet, bio, is_accrediting, integral, assess_uri
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    pool.execute(query, [
        name, password, wallet, bio, isAccrediting, integral, assessUri
    ], (err, result) => {
        if (err) {
            console.error('Failed to add user:', err);
            return res.status(500).json({ error: "Failed to add user" });
        }
        res.status(200).json({ message: 'User added successfully', userId: result.insertId });
        console.log("添加用户信息成功");
    });
});

// 6. 获取用户信息
app.get('/getUser/:wallet', (req, res) => {
    const wallet = req.params.wallet;
    const query = 'SELECT * FROM users WHERE wallet = ?';
    pool.query(query, [wallet], (error, results) => {
        if (error) {
            console.error('Failed to get user:', error);
            return res.status(500).json({ error: 'Failed to get user' });
        }
        res.json(results[0] || null);
        console.log("获取用户信息成功");
    });
});

// 7. 添加鉴定信息
app.post('/addAccrediting', (req, res) => {
    const {
        name,
        tokenId,
        messages,
        owner,
        isApproved
    } = req.body;

    const query = `
        INSERT INTO accrediting (
            name, token_id, messages, owner, is_approved
        ) VALUES (?, ?, ?, ?, ?)
    `;

    pool.execute(query, [
        name, tokenId, messages, owner, isApproved
    ], (err, result) => {
        if (err) {
            console.error('Failed to add accrediting:', err);
            return res.status(500).json({ error: "Failed to add accrediting" });
        }
        res.status(200).json({ message: 'Accrediting added successfully', accreditingId: result.insertId });
        console.log("添加鉴定信息成功");
    });
});

// 8. 获取鉴定信息
app.get('/getAccreditings', (req, res) => {
    const query = 'SELECT * FROM accrediting';
    pool.query(query, (error, results) => {
        if (error) {
            console.error('Failed to get accrediting:', error);
            return res.status(500).json({ error: 'Failed to get accrediting' });
        }
        res.json(results);
        console.log("获取鉴定信息成功");
    });
});

// 创建blockchain_transactions表（如果不存在）
const createBlockchainTransactionsTable = () => {
  const query = `
    CREATE TABLE IF NOT EXISTS blockchain_transactions (
      id INT(11) AUTO_INCREMENT PRIMARY KEY,
      block_number BIGINT NOT NULL,
      block_timestamp DATETIME NOT NULL,
      transaction_hash VARCHAR(66) NOT NULL,
      from_address VARCHAR(42) NOT NULL,
      to_address VARCHAR(42) NOT NULL,
      gas VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL,
      operation_description TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  
  pool.query(query, (error, results) => {
    if (error) {
      console.error('创建blockchain_transactions表失败:', error);
    } else {
      console.log('blockchain_transactions表已创建或已存在');
    }
  });
};

// 在应用启动时执行表创建
createBlockchainTransactionsTable();

// 9. 添加区块链交易记录
app.post('/addTransaction', (req, res) => {
  const {
    blockNumber,
    blockTimestamp,
    transactionHash,
    fromAddress,
    toAddress,
    gas,
    status,
    operationDescription
  } = req.body;

  const query = `
    INSERT INTO blockchain_transactions (
      block_number, block_timestamp, transaction_hash, from_address, 
      to_address, gas, status, operation_description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  pool.execute(query, [
    blockNumber, 
    blockTimestamp, 
    transactionHash, 
    fromAddress, 
    toAddress, 
    gas, 
    status, 
    operationDescription
  ], (err, result) => {
    if (err) {
      console.error('保存区块链交易记录失败:', err);
      return res.status(500).json({ error: "保存区块链交易记录失败" });
    }
    res.status(200).json({ 
      message: '交易记录保存成功', 
      transactionId: result.insertId 
    });
    console.log("添加区块链交易记录成功");
  });
});

// 10. 获取所有交易记录
app.get('/getTransactions', (req, res) => {
  const sortField = req.query.sortField || 'block_timestamp';
  const sortOrder = req.query.sortOrder || 'desc';
  
  // 构建排序SQL
  const sortSql = `ORDER BY ${sortField === 'block_number' ? 'block_number' : 'block_timestamp'} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
  
  const query = `SELECT * FROM blockchain_transactions ${sortSql}`;
  
  pool.query(query, (error, results) => {
    if (error) {
      console.error('获取交易记录失败:', error);
      return res.status(500).json({ error: '获取交易记录失败' });
    }
    res.json(results);
    console.log("获取所有交易记录成功");
  });
});

// 11. 根据地址获取交易记录
app.get('/getTransactionsByAddress/:address', (req, res) => {
  const address = req.params.address;
  const sortField = req.query.sortField || 'block_timestamp';
  const sortOrder = req.query.sortOrder || 'desc';
  
  // 构建排序SQL
  const sortSql = `ORDER BY ${sortField === 'block_number' ? 'block_number' : 'block_timestamp'} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
  
  const query = `
    SELECT * FROM blockchain_transactions 
    WHERE from_address = ? OR to_address = ? 
    ${sortSql}
  `;
  
  pool.query(query, [address, address], (error, results) => {
    if (error) {
      console.error('获取地址交易记录失败:', error);
      return res.status(500).json({ error: '获取地址交易记录失败' });
    }
    res.json(results);
    console.log(`获取地址 ${address} 的交易记录成功`);
  });
});

// 12. 获取交易详情
app.get('/getTransaction/:hash', (req, res) => {
  const hash = req.params.hash;
  
  const query = 'SELECT * FROM blockchain_transactions WHERE transaction_hash = ?';
  
  pool.query(query, [hash], (error, results) => {
    if (error) {
      console.error('获取交易详情失败:', error);
      return res.status(500).json({ error: '获取交易详情失败' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: '未找到交易记录' });
    }
    
    res.json(results[0]);
    console.log(`获取交易 ${hash} 的详情成功`);
  });
});

// 13. 获取最近的交易记录，带分页功能
app.get('/getRecentTransactions', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const offset = (page - 1) * pageSize;
  const sortField = req.query.sortField || 'block_timestamp';
  const sortOrder = req.query.sortOrder || 'desc';
  
  // 构建排序SQL
  const sortSql = `ORDER BY ${sortField === 'block_number' ? 'block_number' : 'block_timestamp'} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
  
  const countQuery = 'SELECT COUNT(*) as total FROM blockchain_transactions';
  const dataQuery = `
    SELECT * FROM blockchain_transactions 
    ${sortSql}
    LIMIT ? OFFSET ?
  `;
  
  pool.query(countQuery, (error, countResults) => {
    if (error) {
      console.error('获取交易记录总数失败:', error);
      return res.status(500).json({ error: '获取交易记录失败' });
    }
    
    const totalRecords = countResults[0].total;
    const totalPages = Math.ceil(totalRecords / pageSize);
    
    pool.query(dataQuery, [pageSize, offset], (error, dataResults) => {
      if (error) {
        console.error('获取交易记录失败:', error);
        return res.status(500).json({ error: '获取交易记录失败' });
      }
      
      res.json({
        data: dataResults,
        pagination: {
          currentPage: page,
          pageSize: pageSize,
          totalRecords: totalRecords,
          totalPages: totalPages
        }
      });
      console.log("获取最近交易记录成功");
    });
  });
});

app.listen(port, () => {
    console.log(`服务器运行在端口${port}`);
})