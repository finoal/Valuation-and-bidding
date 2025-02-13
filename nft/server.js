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






app.listen(port, () => {
    console.log(`服务器运行在端口${port}`);
})