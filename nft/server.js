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

//address to, string memory uri, uint96 royaltyFeeNumber)
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







app.listen(port, () => {
    console.log(`服务器运行在端口${port}`);
})