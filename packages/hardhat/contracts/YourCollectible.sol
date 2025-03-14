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

    //追踪和生成唯一的ID
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter; // 唯一ID计数器
    Counters.Counter private _transactionCounter; // 交易顺序计数器

    uint256 public totalFeesCollected; // 收集的手续费

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
        string assessUri; // 机构相关信息，机构的相关证书
    }


    //accrediting 鉴定信息
    struct Accrediting {
        string name;
        uint256 tokenId;
        string messages;
        address owner;
        uint256 time;
    }

    // 用户注册功能
    mapping(address => User) private  _users; // 用户映射
    mapping(address => Accrediting) private _Accreditings;
    mapping(uint256 => Accrediting) private _AccreditById;
    // 鉴定事件 参数 tokenid institution 鉴定机构地址 message 鉴定信息
    event AccreditationPerformed(uint256 indexed tokenId, address indexed institution, string message, uint256 timestamp);

    function registerUser(string memory _name, string memory _password, string memory _bio, bool _isAccrediting) public {
        require(bytes(_users[msg.sender].name).length == 0, "User already registered");
        _users[msg.sender] = User(_name, stringToBytes32(_password), payable(msg.sender), _bio, _isAccrediting, 0, "");

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


    function updateUserInfo(string memory _assessUri) public {
        // 鉴定机构更新信息
        require(_users[msg.sender].isAccrediting, "Not an accrediting institution");
        require(bytes(_assessUri).length > 0, "Assess info cannot be empty");
        _users[msg.sender].assessUri = _assessUri;
    }

        //查看鉴定机构信息
    function getUserMessage(address userAddress) public view  returns (string memory, string memory, uint256, string memory) {
        User memory user = _users[userAddress];
        require(user.isAccrediting, "Not an accrediting institution");
        return (user.name, user.bio, user.integral, user.assessUri);
    }

    // NFT数据结构
    struct NftItem {
        uint256 tokenId;  // 唯一ID
        uint256 price; // 价格
        address payable seller; // 出售者
        bool isListed; // 是否上架
        string tokenUri; // NFT的URI 包含对NFT的元数据（相关描述，分类）
        bool isAccredited; // 是否允许被鉴定
        uint256 accreditedCount; // 被鉴定次数
        address[] accreditedInstitutions; // 鉴定该NFT的机构列表
    }

    mapping(uint256 => NftItem) private _idToNftItem; // NFT数据
    uint256[] private _listedTokenIds; // 上架的NFT的ID列表
    mapping(uint256 => uint256) private _tokenIdToListedIndex; // NFT的ID到上架列表索引的映射

    uint256 public listingFeePercentage = 250; // 2.5%
    uint256 public constant MAX_LISTING_FEE_PERCENTAGE = 1000; // 10%

    
    event ListingFeePercentageUpdated(uint256 newListingFeePercentage);
    event FeesWithdrawn(address indexed owner, uint256 amount);
    event RoyaltyPaid(uint256 transactionId, uint256 indexed tokenId, address indexed creator, uint256 amount, uint256 timestamp);
    event FeesReceived(address indexed sender, uint256 amount);
    // event Transfer( address indexed from,address indexed to,uint256 indexed tokenId,uint256 timestamp,  uint256 transactionId );
    event TransactionRecord(address indexed from,address indexed to, string transactionType,uint256 amount,uint256 timestamp,uint256 transactionId);
    //积分记录
    event Integral(address indexed sender, uint256 tokenId, uint256 integral, uint256 timestamp );

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
            seller: payable(msg.sender),
            isListed: false,
            tokenUri: completeTokenURI,
            isAccredited: false,
            accreditedCount: 0, //被鉴定次数
            accreditedInstitutions: new address[](0)
        });

        return tokenId;
    }

    //设置鉴定状态，只有鉴定状态为ture时，鉴定机构才可以进行鉴定
    function modiyAccredited(uint256 tokenId, bool isAccredited) public {
        require(ownerOf(tokenId) == msg.sender || isAuthorizedForAuction(tokenId, msg.sender), "You are not the owner or authorized");
        _idToNftItem[tokenId].isAccredited = isAccredited;
    }

    //通过id获取被鉴定的次数
    function getAccreditedCount(uint256 tokenId) public view returns (uint256 accreditedCount) {
        return  _idToNftItem[tokenId].accreditedCount;
    }

    // 获取所有可被鉴定的NFT
    function getAccreditableNFTs() external view returns (NftItem[] memory) {
        uint256 totalTokens = _tokenIdCounter.current();//获取当前的token数量
        uint256 count = 0;//初始化数量
        //遍历所有的token找到所有可被鉴定的NFT
        for (uint256 i = 1; i <= totalTokens; i++) {
            if (_idToNftItem[i].isAccredited) {
                count++;//确定数组长度
            }
        }

        NftItem[] memory accreditableNFTs = new NftItem[](count);
        uint256 index = 0;

        for (uint256 i = 1; i <= totalTokens; i++) {
            if (_idToNftItem[i].isAccredited) {
                accreditableNFTs[index] = _idToNftItem[i];
                index++;
            }
        }
        return accreditableNFTs;
    }

    // NFT鉴定功能
    function performAccreditation(uint256 tokenId, string memory message) public {
        require(_users[msg.sender].isAccrediting, "Only accrediting institutions can perform this action");
        require(bytes(_users[msg.sender].assessUri).length > 0, "Accreditation info must be completed");
        require(_idToNftItem[tokenId].isAccredited, "NFT is not set for accreditation");

        // 记录鉴定机构
        _idToNftItem[tokenId].accreditedInstitutions.push(msg.sender);
        _idToNftItem[tokenId].accreditedCount += 1; // 增加鉴定次数
        //每鉴定一次给予1积分。
        _users[msg.sender].integral += 1;
        emit Integral(msg.sender, tokenId, 1, block.timestamp);
        _Accreditings[msg.sender] = Accrediting(_users[msg.sender].name,tokenId, message,msg.sender, block.timestamp);
        _AccreditById[tokenId] = Accrediting(_users[msg.sender].name,tokenId, message,msg.sender, block.timestamp);
        emit AccreditationPerformed(tokenId, msg.sender, message, block.timestamp);
    }

    function getNftItem(uint256 tokenId) public view returns (NftItem memory) { // 获取NFT数据
        return _idToNftItem[tokenId];
    }

    function setListingFeePercentage(uint256 _newListingFeePercentage) external onlyOwner { // 设置拍卖手续费百分比
        require(_newListingFeePercentage <= MAX_LISTING_FEE_PERCENTAGE, "Exceeds maximum fee percentage");
        listingFeePercentage = _newListingFeePercentage;

        emit ListingFeePercentageUpdated(_newListingFeePercentage);
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
        uint256 num; // 参与竞拍人数
        uint256 bidCount; // 竞价次数
        address[] bidders; // 参与者地址列表
        uint256 startTime;
    }

    // 使用映射存储所有拍卖，以Token ID为键
    mapping(uint256 => Auction) private _auctions;

    // 授权映射：tokenId => 被授权地址 => 是否授权
    mapping(uint256 => mapping(address => bool)) private _auctionAuthorized;

    // 授权地址列表：tokenId => 授权地址数组
    mapping(uint256 => address[]) private _authorizedAddresses;
    
    // 反向映射：地址 => 被授权的tokenId数组
    mapping(address => uint256[]) private _addressToAuthorizedTokenIds;

    // 授权事件
    event AuctionAuthorized(uint256 indexed tokenId, address indexed owner, address indexed authorized);
    event AuctionAuthorizationRevoked(uint256 indexed tokenId, address indexed owner, address indexed authorized);

    // 授权用户结束拍卖的权限
    function authorizeAuctionEnder(uint256 tokenId, address user) public {
        require(ownerOf(tokenId) == msg.sender, "Not the token owner");
        require(user != address(0), "Invalid user address");
        require(!_auctionAuthorized[tokenId][user], "Address already authorized");
        _auctionAuthorized[tokenId][user] = true;
        _authorizedAddresses[tokenId].push(user); // 添加到授权地址列表
        _addressToAuthorizedTokenIds[user].push(tokenId); // 添加到反向映射
        emit AuctionAuthorized(tokenId, msg.sender, user);
    }

    // 撤销用户的授权
    function revokeAuctionAuthorization(uint256 tokenId, address user) public {
        require(ownerOf(tokenId) == msg.sender, "Not the token owner");
        require(user != address(0), "Invalid user address");
        _auctionAuthorized[tokenId][user] = false;
         // 从授权地址列表中移除
        for (uint256 i = 0; i < _authorizedAddresses[tokenId].length; i++) {
            if (_authorizedAddresses[tokenId][i] == user) {
                _authorizedAddresses[tokenId][i] = _authorizedAddresses[tokenId][_authorizedAddresses[tokenId].length - 1];
                _authorizedAddresses[tokenId].pop();
                break;
            }
        }
        // 从反向映射中移除
        for (uint256 i = 0; i < _addressToAuthorizedTokenIds[user].length; i++) {
            if (_addressToAuthorizedTokenIds[user][i] == tokenId) {
                _addressToAuthorizedTokenIds[user][i] = _addressToAuthorizedTokenIds[user][_addressToAuthorizedTokenIds[user].length - 1];
                _addressToAuthorizedTokenIds[user].pop();
                break;
            }
        }
        emit AuctionAuthorizationRevoked(tokenId, msg.sender, user);
    }

    // 检查用户是否被授权
    function isAuthorizedForAuction(uint256 tokenId, address user) public view returns (bool) {
        return _auctionAuthorized[tokenId][user];
    }

    // 获取特定 NFT 的所有授权地址
    function getAuthorizedAddresses(uint256 tokenId) public view returns (address[] memory) {
        return _authorizedAddresses[tokenId];
    }
    
    // 获取特定地址被授权的所有 tokenId
    function getAuthorizedTokenIds(address user) public view returns (uint256[] memory) {
        return _addressToAuthorizedTokenIds[user];
    }

    // 获取特定地址被授权的所有 tokenId
    function getAuthorizedTokenIds() public view returns (uint256[] memory) {
        return _addressToAuthorizedTokenIds[msg.sender];
    }

    // 清除NFT的所有授权
    function _clearAuctionAuthorizations(uint256 tokenId) internal {
        address[] storage authorizedUsers = _authorizedAddresses[tokenId];
        for (uint256 i = 0; i < authorizedUsers.length; i++) {
            address user = authorizedUsers[i];
            _auctionAuthorized[tokenId][user] = false;
            
            // 从反向映射中移除
            for (uint256 j = 0; j < _addressToAuthorizedTokenIds[user].length; j++) {
                if (_addressToAuthorizedTokenIds[user][j] == tokenId) {
                    _addressToAuthorizedTokenIds[user][j] = _addressToAuthorizedTokenIds[user][_addressToAuthorizedTokenIds[user].length - 1];
                    _addressToAuthorizedTokenIds[user].pop();
                    break;
                }
            }
        }
        delete _authorizedAddresses[tokenId];   
    }
    
    // 事件，用于记录拍卖相关活动
    //创建拍卖
    event AuctionCreated(uint256 indexed tokenId, address indexed seller, uint256 startPrice, uint256 endTime, uint256 startTime);
    //竞价 id 出价者 金额 
    event NewBid(uint256 indexed tokenId, address indexed bidder, uint256 amount,uint256 timestamp);
    // 竞拍结束 赢家 金额
    event AuctionEnded(uint256 indexed tokenId, address indexed winner, uint256 amount,uint256 timestamp);

    // 创建拍卖函数
    /**
     * @dev 创建一个新的拍卖
     * @param tokenId NFT的Token ID
     * @param startPrice 起拍价格
     * @param blocktime 拍卖结束时间
     */
    function createAuction(uint256 tokenId,string memory uri, uint256 startPrice, uint256 blocktime) external payable {
    // 确保调用者是NFT的当前持有者
    require(ownerOf(tokenId) == msg.sender || isAuthorizedForAuction(tokenId, msg.sender), "You are not the owner or authorized");

    // 确保该NFT当前没有进行中的拍卖
    require(!_auctions[tokenId].isActive, "Auction already active for this token");

    // 确保拍卖持续时间合法
    require(blocktime > block.timestamp, "Duration must be greater than 0");

    // 获取初始创建者和版税金额
    (address creator, ) = royaltyInfo(tokenId, startPrice);//uint256 royaltyAmount

    //设置初始为无版税
    bool royalty = false;

    // 如果创建者不是NFT的初始创建者，则需要支付版税
    if (creator != msg.sender) {
       royalty = true;
    }

    uint256 start = block.timestamp;
    // 初始化拍卖并存储到映射中
    _auctions[tokenId] = Auction({
        tokenId: tokenId,
        uri: uri,
        seller: payable(msg.sender),
        startPrice: startPrice,
        highestBid: 0,
        highestBidder: payable(address(0)),
        endTime: blocktime,
        isActive: true,
        isroyalty: royalty, // 是否有版税
        num: 0, // 竞拍初始参与人数为0
        bidCount: 0, // 竞价次数初始为0
        bidders: new address[](0), // 参与者地址列表初始为空
        startTime: start
    });

    // 触发拍卖创建事件
    emit AuctionCreated(tokenId, msg.sender, startPrice, blocktime, block.timestamp);
}


    // 竞标函数
    /**
     * @dev 参与拍卖出价
     * @param tokenId 拍卖的NFT的Token ID
     */
    function placeBid(uint256 tokenId) external payable {
        // 确保拍卖仍在进行中
        require(_auctions[tokenId].isActive, "Auction is not active");

        // 确保拍卖没有结束
        require(block.timestamp < _auctions[tokenId].endTime, "Auction has ended");

        // 确保出价高于起拍价
        require(msg.value > _auctions[tokenId].startPrice, "Bid must be higher than start price");

        // 确保出价高于当前最高出价
        require(msg.value > _auctions[tokenId].highestBid, "Bid must be higher than current highest bid");

        // 生成交易ID
        _transactionCounter.increment();
        uint256 transactionId = _transactionCounter.current();

        // 如果已有最高出价，返还之前的竞标者
        if (_auctions[tokenId].highestBidder != address(0)) {
            address previousBidder = _auctions[tokenId].highestBidder;
            uint256 previousBid = _auctions[tokenId].highestBid;
            
            // 返还之前的竞标者
            (bool success, ) = previousBidder.call{value: previousBid}("");
            require(success, "Failed to refund previous bidder");
            
            // 记录退款交易
            emit TransactionRecord(
                address(this),
                previousBidder,
                "BidRefund",
                previousBid,
                block.timestamp,
                transactionId
            );
        }
        // 更新拍卖的最高出价和竞标者信息以及参与人数
         _auctions[tokenId].highestBid = msg.value;
         _auctions[tokenId].highestBidder = payable(msg.sender);
        // 增加竞价次数
        _auctions[tokenId].bidCount += 1;

        // 如果出价者是新的参与者，则增加参与者人数并记录地址
        if (!isBidder(_auctions[tokenId].bidders, msg.sender)) {
            _auctions[tokenId].num += 1;
            _auctions[tokenId].bidders.push(msg.sender);
        }
           
            // _transactionCounter.increment();
              // 记录新的竞价交易
        // emit Transfer(
        //     msg.sender,
        //     address(this),
        //     tokenId,
        //     block.timestamp,
        //     transactionId
        // );
        // 触发新出价事件
        emit NewBid(tokenId, msg.sender, msg.value, block.timestamp); 
    }

    // 辅助函数：检查地址是否已经在参与者列表中
    function isBidder(address[] memory _bidders, address _bidder) private pure returns (bool) {
        for (uint256 i = 0; i < _bidders.length; i++) {
            if (_bidders[i] == _bidder) {
                return true;
            }
        }
        return false;
    }

    // 结束拍卖函数
    /**
     * @dev 结束拍卖并完成交易
     * @param tokenId 拍卖的NFT的Token ID
     */
    // 修改结束拍卖函数
    function endAuction(uint256 tokenId, uint256 currentTime) external {
        require(_auctions[tokenId].isActive, "Auction is not active");
        require(
            currentTime >= _auctions[tokenId].endTime,
            //string(abi.encodePacked("Auction has not ended yet. Current time: ", uint2str(currentTime), ", End time: ", uint2str(_auctions[tokenId].endTime)))
            "Auction has not ended yet"
        );
        
        require(
            ownerOf(tokenId) == msg.sender || _auctionAuthorized[tokenId][msg.sender],
            "Not authorized to end auction"
        );

        _auctions[tokenId].isActive = false;

        if (_auctions[tokenId].highestBidder != address(0)) {
            uint256 highestBid = _auctions[tokenId].highestBid;
            uint256 sellerAmount = highestBid;
            if (_auctions[tokenId].isroyalty) {
                // 获取初始创建者和版税金额
                (address creator, uint256 royaltyAmount) = royaltyInfo(tokenId, highestBid);
                
                sellerAmount = sellerAmount - royaltyAmount;

                if (royaltyAmount > 0) {
                    payable(creator).transfer(royaltyAmount);
                    _transactionCounter.increment();
                    emit TransactionRecord(
                        address(this),
                        creator,
                        "RoyaltyPayment",
                        royaltyAmount,
                        block.timestamp,
                        _transactionCounter.current()
                    );
                }
            }
            uint256 institutionFee = (highestBid * 10) / 100; // 10%opyright
            sellerAmount = sellerAmount - institutionFee;

            // 分发给鉴定机构
            address[] memory institutions = _idToNftItem[tokenId].accreditedInstitutions;
            if (institutions.length > 0) {
                uint256 institutionShare = institutionFee / institutions.length;
                for (uint256 i = 0; i < institutions.length; i++) {
                    payable(institutions[i]).transfer(institutionShare);
                    // 记录鉴定费用支付交易
                    _transactionCounter.increment();
                    emit TransactionRecord(
                        address(this),
                        institutions[i],
                        "AccreditationFee",
                        institutionShare,
                        block.timestamp,
                        _transactionCounter.current()
                    );
                }
            } else {
                // 如果没有鉴定机构，费用返还给卖家
                sellerAmount = sellerAmount + institutionFee;
            }

            // 转账给卖家
            _auctions[tokenId].seller.transfer(sellerAmount);
            // 记录卖家收款交易
            _transactionCounter.increment();
            emit TransactionRecord(
                address(this),
                _auctions[tokenId].seller,
                "AuctionSettlement",
                sellerAmount,
                block.timestamp,
                _transactionCounter.current()
            );

            // 在转移NFT之前清除所有授权
            _clearAuctionAuthorizations(tokenId);
            
            // 转移NFT所有权并记录交易
            address from = _auctions[tokenId].seller;
            address to = _auctions[tokenId].highestBidder;
            _transfer(from, to, tokenId);

            emit AuctionEnded(tokenId, _auctions[tokenId].highestBidder, sellerAmount, currentTime);
        } else {
            emit AuctionEnded(tokenId, address(0), 0, currentTime);
        }
    }

    // 重写 _transfer 函数以确保在转移时清除授权
    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        super._transfer(from, to, tokenId);
        // 清除该NFT的所有授权
        _clearAuctionAuthorizations(tokenId);
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

 function getContractAddress() public view returns (address) {
    return address(this);
}

}