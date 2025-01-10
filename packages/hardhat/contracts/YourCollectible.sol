// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.2;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";

contract YourCollectible is
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage,
    Ownable,
    ReentrancyGuard,
    ERC721Royalty
{

//密码加密
function stringToBytes32(string memory source) 
        internal
        pure
        returns (bytes32 result)
    {   // 通过调用keccak256计算字符串的hash值
        assembly {
            result := mload(add(source, 32)) // 通过keccak256计算字符串的hash值
        }
    }

    // 将bytes32类型转换为字符串
    function bytes32ToString(bytes32 x) internal pure returns (string memory) { // 通过keccak256计算字符串的hash值
        bytes memory bytesString = new bytes(32);
        uint256 charCount = 0;
        for (uint256 j = 0; j < 32; j++) {
            bytes1 char = bytes1(bytes32(uint256(x) * 2**(8 * j)));
            if (char != 0) {
                bytesString[charCount] = char;
                charCount++;
            }
        }
        bytes memory bytesStringTrimmed = new bytes(charCount);
        for (uint256 j = 0; j < charCount; j++) {
            bytesStringTrimmed[j] = bytesString[j];
        }
        return string(bytesStringTrimmed);
    }

    // 比较两个字符串是否相等
    function compareStrings(string memory a, string memory b)
        internal
        pure
        returns (bool)
    {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }

    //比较两个bytes32类型的字符串
    function compareBytes32Strings(bytes32 a, bytes32 b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }

    struct User {
        string name; // 用户名
        bytes32 password; // 密码
        address payable wallet; // 钱包地址
        string bio; // 个人简介
        bool isAccrediting; //是否鉴定机构
        uint256 integral; //积分
    }


    // 用户注册功能
    mapping(address => User) private  _users; // 用户映射

    function registerUser(string memory _name, string memory _password, string memory _bio, bool _isAccrediting) public {
        require(bytes(_users[msg.sender].name).length == 0, "User already registered");
        _users[msg.sender] = User(_name, stringToBytes32(_password), payable(msg.sender), _bio, _isAccrediting, 0);

    }

    function getUser(address userAddress) public view returns (string memory,bytes32 ,string memory, uint256) {
        User memory user = _users[userAddress];
        return (user.name,user.password, user.bio, user.integral);
    }

    //用户登录
   function verifyPwd(address userAddress,string memory userName, string memory password) public view returns (bool, bool) {
        require(bytes(_users[userAddress].name).length != 0, "User not registered");
        
        User memory user = _users[userAddress];
        
        bool isNameValid = compareStrings(user.name, userName);
        bool isPwdValid = compareBytes32Strings(user.password, stringToBytes32(password));

        return (isNameValid && isPwdValid, user.isAccrediting);
    }



    //追踪和生成唯一的ID
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter; // 唯一ID计数器
    Counters.Counter private _transactionCounter; // 交易顺序计数器

    uint256 public totalFeesCollected; // 收集的手续费


    // NFT数据结构
    struct NftItem {
        uint256 tokenId;  // 唯一ID
        uint256 price; // 价格
        address payable seller; // 出售者
        bool isListed; // 是否上架
        string tokenUri; // NFT的URI 包含对NFT的元数据（相关描述，分类）
        bool isAccredited; // 是否允许被鉴定
    }

    mapping(uint256 => NftItem) private _idToNftItem; // NFT数据
    uint256[] private _listedTokenIds; // 上架的NFT的ID列表
    mapping(uint256 => uint256) private _tokenIdToListedIndex; // NFT的ID到上架列表索引的映射

    uint256 public listingFeePercentage = 250; // 2.5%
    uint256 public constant MAX_LISTING_FEE_PERCENTAGE = 1000; // 10%

    
    event NftListed(uint256 indexed tokenId, address indexed seller, uint256 price, uint256 timestamp, uint256 transactionId);
    event NftUnlisted(uint256 transactionId, uint256 indexed tokenId, address indexed seller, uint256 timestamp);
    event NftPurchased(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price, uint256 timestamp, uint256 transactionId);
    event ListingFeePercentageUpdated(uint256 newListingFeePercentage);
    event FeesWithdrawn(address indexed owner, uint256 amount);
    event RoyaltyPaid(uint256 transactionId, uint256 indexed tokenId, address indexed creator, uint256 amount, uint256 timestamp);
    event FeesReceived(address indexed sender, uint256 amount);
    event Transfer( address indexed from,address indexed to,uint256 indexed tokenId,uint256 timestamp,  bytes32 transactionId );
    constructor() ERC721("YourCollectible", "ZJ") {}

    function _baseURI() internal pure override returns (string memory) {
        return "https://gateway.pinata.cloud/ipfs/";
    }

    function mintItem(address to, string memory uri, uint96 royaltyFeeNumber) public returns (uint256) {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        _setTokenRoyalty(tokenId, msg.sender, royaltyFeeNumber);

        string memory completeTokenURI = string(abi.encodePacked(_baseURI(), uri));

        _idToNftItem[tokenId] = NftItem({
            tokenId: tokenId,
            price: 0,
            seller: payable(address(0)),
            isListed: false,
            tokenUri: completeTokenURI,
            isAccredited: false
        });

        return tokenId;
    }

    
    function placeNftOnSale(uint256 tokenId, uint256 price) external payable { // 上架NFT
        require(price > 0, "Price must be greater than 0");
        require(ownerOf(tokenId) == msg.sender, "You are not the owner");
        require(!_idToNftItem[tokenId].isListed, "NFT is already listed");

        uint256 listingFee = calculateListingFee(price);
        require(msg.value >= listingFee, "Insufficient listing fee");

        _idToNftItem[tokenId] = NftItem({
            tokenId: tokenId,
            price: price,
            seller: payable(msg.sender),
            isListed: true,
            tokenUri: tokenURI(tokenId),
            isAccredited: _idToNftItem[tokenId].isAccredited //

        });

        _listedTokenIds.push(tokenId);
        _tokenIdToListedIndex[tokenId] = _listedTokenIds.length - 1;

        uint256 transactionId = _transactionCounter.current();
        _transactionCounter.increment();

        emit NftListed(tokenId, msg.sender, price, block.timestamp, transactionId);
    }

    function unlistNft(uint256 tokenId) external {
        NftItem storage item = _idToNftItem[tokenId];
        require(item.isListed, "NFT is not listed");
        require(item.seller == msg.sender, "You are not the seller");
        item.isListed = false;
        item.price = 0;
        item.seller = payable(address(0));

        _removeFromListed(tokenId);

        uint256 transactionId = _transactionCounter.current();
        _transactionCounter.increment();

        emit NftUnlisted(transactionId,tokenId, msg.sender, block.timestamp);
    }

    function purchaseNft(uint256 tokenId) external payable nonReentrant { // 购买NFT
        NftItem storage item = _idToNftItem[tokenId];
        require(item.isListed, "NFT is not listed for sale");
        require(msg.value >= item.price, "Insufficient payment");
        require(item.seller != msg.sender, "Cannot purchase your own NFT");

        _transfer(item.seller, msg.sender, tokenId);

        payable(item.seller).transfer(item.price);

        (address creator, uint256 royaltyAmount) = royaltyInfo(tokenId, msg.value);
        uint256 transactionId = _transactionCounter.current();
        if (royaltyAmount > 0) {
            payable(creator).transfer(royaltyAmount);
            _transactionCounter.increment();

            emit RoyaltyPaid(transactionId, tokenId, creator, royaltyAmount, block.timestamp);
        }

        
        _transactionCounter.increment();

        emit NftPurchased(tokenId, msg.sender, item.seller, item.price, block.timestamp, transactionId);

        item.isListed = false;
        item.seller = payable(address(0));
        item.price = 0;

        _removeFromListed(tokenId);
    }

    event TransactionRecord(address indexed buyer, address indexed seller, uint256 tokenId, uint256 amount, uint256 timestamp, uint256 transactionId);

    function getNftItem(uint256 tokenId) public view returns (NftItem memory) { // 获取NFT数据
        return _idToNftItem[tokenId];
    }

    function setListingFeePercentage(uint256 _newListingFeePercentage) external onlyOwner { // 设置拍卖手续费百分比
        require(_newListingFeePercentage <= MAX_LISTING_FEE_PERCENTAGE, "Exceeds maximum fee percentage");
        listingFeePercentage = _newListingFeePercentage;

        emit ListingFeePercentageUpdated(_newListingFeePercentage);
    }

    function getListedItemsCount() external view returns (uint256) { // 获取已上架NFT数量
        return _listedTokenIds.length;
    }

    function _removeFromListed(uint256 tokenId) internal { // 从已上架NFT列表中移除
        uint256 lastIndex = _listedTokenIds.length - 1;
        uint256 index = _tokenIdToListedIndex[tokenId];

        uint256 lastTokenId = _listedTokenIds[lastIndex];
        _listedTokenIds[index] = lastTokenId;
        _tokenIdToListedIndex[lastTokenId] = index;

        _listedTokenIds.pop();
        delete _tokenIdToListedIndex[tokenId];
    }

    function getAllListedNfts() external view returns (NftItem[] memory) { // 获取所有已上架NFT
        uint256 totalListed = _listedTokenIds.length;
        NftItem[] memory items = new NftItem[](totalListed);

        for (uint256 i = 0; i < totalListed; ++i) {
            uint256 tokenId = _listedTokenIds[i];
            items[i] = _idToNftItem[tokenId];
        }

        return items;
    }
    
    function calculateListingFee(uint256 priceInWei) public view returns (uint256) { // 计算拍卖手续费
        return (priceInWei * listingFeePercentage) / 10000;
    }

    function withdrawFees() external onlyOwner nonReentrant { // 提取所有拍卖手续费
        uint256 amount = totalFeesCollected;
        require(amount > 0, "No fees to withdraw");

        totalFeesCollected = 0;

        (bool success, ) = owner().call{value: amount}("");
        require(success, "Failed to withdraw fees");

        emit FeesWithdrawn(owner(), amount);
    }

    function _beforeTokenTransfer( // 重写ERC721的_beforeTokenTransfer方法
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize); 
    } 

    function _burn( // 销毁NFT
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage, ERC721Royalty) {
        super._burn(tokenId);
    }

    function tokenURI( // 获取NFT的元数据
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface( // 检查合约是否支持某个接口
        bytes4 interfaceId
    )
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage, ERC721Royalty)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }



    // 定义拍卖结构体
    struct Auction {
        uint256 tokenId; // 拍卖的NFT的Token ID
        string uri; // NFT的元数据
        address payable seller; // 卖家地址
        uint256 startPrice; // 起拍价格
        uint256 highestBid; // 当前最高出价
        address payable highestBidder; // 当前最高出价者的地址
        uint256 endTime; // 拍卖结束时间（时间戳）
        bool isActive; // 拍卖是否仍在进行中
        bool isroyalty; // 是否有版税
    }

    // 使用映射存储所有拍卖，以Token ID为键
    mapping(uint256 => Auction) private _auctions;

    // 事件，用于记录拍卖相关活动
    //创建拍卖
    event AuctionCreated(uint256 indexed tokenId, address indexed seller, uint256 startPrice, uint256 endTime);
    //竞价 id 出价者 金额 
    event NewBid(uint256 indexed tokenId, address indexed bidder, uint256 amount,uint256 timestamp);
    // 竞拍结束 赢家 金额
    event AuctionEnded(uint256 indexed tokenId, address indexed winner, uint256 amount);

    // 创建拍卖函数
    /**
     * @dev 创建一个新的拍卖
     * @param tokenId NFT的Token ID
     * @param startPrice 起拍价格
     * @param duration 拍卖持续时间（以秒为单位）
     */
    function createAuction(uint256 tokenId,string memory uri, uint256 startPrice, uint256 duration) external payable {
    // 确保调用者是NFT的当前持有者
    require(ownerOf(tokenId) == msg.sender, "You are not the owner");

    // 确保该NFT当前没有进行中的拍卖
    require(!_auctions[tokenId].isActive, "Auction already active for this token");

    // 确保拍卖持续时间合法
    require(duration > 0, "Duration must be greater than 0");

    // 获取初始创建者和版税金额
    (address creator, ) = royaltyInfo(tokenId, startPrice);//uint256 royaltyAmount

    //设置初始为无版税
    bool royalty = false;

    // 如果创建者不是NFT的初始创建者，则需要支付版税
    if (creator != msg.sender) {
       royalty = true;
    }

    // 初始化拍卖并存储到映射中
    _auctions[tokenId] = Auction({
        tokenId: tokenId,
        uri: uri,
        seller: payable(msg.sender),
        startPrice: startPrice,
        highestBid: 0,
        highestBidder: payable(address(0)),
        endTime: block.timestamp + duration,
        isActive: true,
        isroyalty: royalty
    });

    // 触发拍卖创建事件
    emit AuctionCreated(tokenId, msg.sender, startPrice, block.timestamp + duration);
}


    // 竞标函数
    /**
     * @dev 参与拍卖出价
     * @param tokenId 拍卖的NFT的Token ID
     */
    function placeBid(uint256 tokenId) external payable {
       

        // 确保拍卖仍在进行中
        require( _auctions[tokenId].isActive, "Auction is not active");

        // 确保拍卖没有结束
        require(block.timestamp <  _auctions[tokenId].endTime, "Auction has ended");

        // 确保出价高于当前最高出价
        require(msg.value >  _auctions[tokenId].highestBid, "Bid must be higher than current highest bid");

        // 如果已有最高出价，返还之前的竞标者
        if ( _auctions[tokenId].highestBidder != address(0)) {
             _auctions[tokenId].highestBidder.transfer( _auctions[tokenId].highestBid);
        }

        // 更新拍卖的最高出价和竞标者信息
         _auctions[tokenId].highestBid = msg.value;
         _auctions[tokenId].highestBidder = payable(msg.sender);

        // 触发新出价事件
        emit NewBid(tokenId, msg.sender, msg.value, block.timestamp); 
    }

    // 结束拍卖函数
    /**
     * @dev 结束拍卖并完成交易
     * @param tokenId 拍卖的NFT的Token ID
     */
    function endAuction(uint256 tokenId) external {
        // Auction storage auction = _auctions[tokenId];

        // 确保拍卖仍在进行中
        require(_auctions[tokenId].isActive, "Auction is not active");


        // 将拍卖标记为已结束
        _auctions[tokenId].isActive = false;

        require( ! _auctions[tokenId].isActive ,"faild of end");

        if (_auctions[tokenId].highestBidder != address(0)) {
            // 如果有竞标者，完成交易
            // 将NFT转移给最高出价者
            _transfer(_auctions[tokenId].seller, _auctions[tokenId].highestBidder, tokenId);

            // 将最高出价金额转移给卖家
            uint256 royaltyAmount;
            address creator;
            // 获取初始创建者和版税金额
            (creator, royaltyAmount) = royaltyInfo(tokenId, _auctions[tokenId].highestBid);
            _auctions[tokenId].highestBid = _auctions[tokenId].highestBid - royaltyAmount;

            // 将最高出价金额转移给卖家
            _auctions[tokenId].seller.transfer(_auctions[tokenId].highestBid);

            if (royaltyAmount > 0) {
                payable(creator).transfer(royaltyAmount);
            }
            // 触发拍卖结束事件
            emit AuctionEnded(tokenId, _auctions[tokenId].highestBidder, _auctions[tokenId].highestBid);
        } else {
            // 如果没有竞标者，取消拍卖
            emit AuctionEnded(tokenId, address(0), 0);
        }
    }

    // 查看拍卖信息函数
    /**
     * @dev 获取拍卖的详细信息
     * @param tokenId 拍卖的NFT的Token ID
     * @return 拍卖的详细信息
     */
    function getAuction(uint256 tokenId) external view returns (Auction memory) {
        return _auctions[tokenId];
    }


    // 获取所有拍卖信息的函数
    /**
     * @dev 获取所有拍卖的详细信息
     * @return 所有拍卖的详细信息数组
     */
    function getAllAuctions() external view returns (Auction[] memory) {
        uint256 totalTokens = _tokenIdCounter.current();
        uint256 activeCount = 0;

        // 遍历所有Token ID，检查是否有活跃的拍卖
        for (uint256 i = 1; i <= totalTokens; i++) {
            if (_auctions[i].isActive) {
                activeCount++;
            }
        }

        // 创建结果数组
        Auction[] memory allAuctions = new Auction[](activeCount);
        uint256 index = 0;

        for (uint256 i = 1; i <= totalTokens; i++) {
            if (_auctions[i].isActive) {
                allAuctions[index] = _auctions[i];
                index++;
            }
        }

        return allAuctions;
    }

//评估机构
    // struct Assess {
    //     string name,
    //     uint256 tokenId,
    //     string messages,
    //     address owner,
    // }
//注册
//accrediting 鉴定机构
    struct Accrediting {
        string name;
        uint256 tokenId;
        string messages;
        address owner;
        bool isApproved;
    }
    //添加评估信息
    // function addAccrediting()  returns () {
        
    // }i
}