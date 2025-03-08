const { parseEther } = require('viem');

interface Institution {
    address: string;
    name: string;
    logo: string;
    verified: boolean;
}

interface Creator extends Institution {
    avatar: string;
}

interface Collector {
    address: string;
    name: string;
    avatar: string;
}

interface NFTTestData {
    id: string;
    name: string;
    kind: string;
    description: string;
    imageUrl: string;
    royaltyFee: number;
    creator: Creator;
    price?: string;
    status: 'listed' | 'auction' | 'sold' | 'unlisted';
    bidHistory?: Array<{
        bidder: Collector;
        amount: string;
        timestamp: number;
    }>;
    accreditations?: Array<{
        institution: Institution;
        message: string;
        timestamp: number;
    }>;
    attributes: Array<{
        trait_type: string;
        value: string;
    }>;
    createdAt: number;
    lastUpdated: number;
    views: number;
    likes: number;
    shares: number;
}

// 艺术品类型
const artTypes = [
    "中国画", "油画", "水彩画", "素描", "版画", "装置艺术", 
    "数字艺术", "混合媒介", "摄影作品", "雕塑", "NFT艺术", "元宇宙艺术",
    "AI生成艺术", "虚拟现实艺术", "增强现实艺术", "交互式艺术"
];

// 艺术风格
const artStyles = [
    "写实主义", "抽象主义", "印象派", "表现主义", "极简主义",
    "波普艺术", "超现实主义", "未来主义", "古典主义", "现代主义",
    "后现代主义", "赛博朋克", "像素艺术", "复古未来主义", "新水墨"
];

// 主题
const themes = [
    "自然风光", "人物肖像", "城市景观", "抽象概念", "历史文化",
    "科技未来", "民族特色", "环境保护", "社会议题", "想象世界",
    "元宇宙场景", "数字身份", "虚拟空间", "人工智能", "区块链"
];

// 机构信息
const institutions: Creator[] = [
    {
        address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        name: "数字艺术研究院",
        logo: "https://example.com/logo1.png",
        verified: true,
        avatar: "https://example.com/logo1.png"
    },
    {
        address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        name: "元宇宙艺术基金会",
        logo: "https://example.com/logo2.png",
        verified: true,
        avatar: "https://example.com/logo2.png"
    },
    {
        address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        name: "区块链艺术协会",
        logo: "https://example.com/logo3.png",
        verified: true,
        avatar: "https://example.com/logo3.png"
    },
    {
        address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        name: "NFT艺术家联盟",
        logo: "https://example.com/logo4.png",
        verified: true,
        avatar: "https://example.com/logo4.png"
    },
    {
        address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
        name: "数字文化研究所",
        logo: "https://example.com/logo5.png",
        verified: true,
        avatar: "https://example.com/logo5.png"
    }
];

// 收藏家信息
const collectors: Collector[] = [
    {
        address: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
        name: "加密艺术收藏家",
        avatar: "https://example.com/avatar1.png"
    },
    {
        address: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
        name: "数字艺术投资者",
        avatar: "https://example.com/avatar2.png"
    },
    {
        address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
        name: "NFT鉴赏家",
        avatar: "https://example.com/avatar3.png"
    },
    {
        address: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
        name: "艺术品经纪人",
        avatar: "https://example.com/avatar4.png"
    },
    {
        address: "0xBcd4042DE499D14e55001CcbB24a551F3b954096",
        name: "元宇宙收藏家",
        avatar: "https://example.com/avatar5.png"
    }
];

// 生成随机描述
function generateDescription(kind: string, style: string, theme: string): string {
    const descriptions = [
        `这是一幅极具代表性的${kind}作品，采用${style}风格，展现了${theme}的独特魅力。艺术家通过创新的数字技术，将传统艺术与现代表达完美融合。`,
        `艺术家通过${kind}的形式，以${style}的手法诠释了${theme}。作品融合了区块链技术与艺术创作，展现了数字时代的艺术可能性。`,
        `这件${kind}作品融合了${style}元素，围绕${theme}展开创作，呈现出独特的艺术视角。作品通过NFT技术确保了其唯一性和真实性。`,
        `作品以${kind}为载体，运用${style}的表现方式，深入探讨了${theme}的深层含义。艺术家巧妙地运用数字技术，创造出震撼人心的视觉体验。`,
        `这是一件关于${theme}的${kind}作品，艺术家采用${style}的创作方法，展现出独特的艺术魅力。作品完美展示了数字艺术与传统美学的碰撞。`
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
}

// 生成属性
function generateAttributes(kind: string, style: string, theme: string): Array<{trait_type: string; value: string}> {
    return [
        { trait_type: "类型", value: kind },
        { trait_type: "风格", value: style },
        { trait_type: "主题", value: theme },
        { trait_type: "创作年代", value: new Date().getFullYear().toString() },
        { trait_type: "稀有度", value: ["普通", "稀有", "极稀有", "传说"][Math.floor(Math.random() * 4)] },
        { trait_type: "技术", value: ["2D", "3D", "VR", "AR", "AI"][Math.floor(Math.random() * 5)] }
    ];
}

// 生成认证信息
function generateAccreditations(): Array<{
    institution: Institution;
    message: string;
    timestamp: number;
}> {
    const messages = [
        "这是一件具有重要艺术价值和收藏价值的数字艺术品，已通过专业评估认证。",
        "经过专业评估，确认作品的创新性和艺术价值，建议收藏。",
        "该作品在技术创新和艺术表现上都达到了很高的水准，具有收藏价值。",
        "作品品质优秀，创意独特，是难得的数字艺术精品。",
        "经过专业机构认证，该作品在艺术性和技术性上都具有很高的价值。"
    ];
    
    const accreditations = [];
    const count = Math.floor(Math.random() * 3) + 1; // 1-3个认证
    const usedInstitutions = new Set<string>();
    
    for (let i = 0; i < count; i++) {
        let institution;
        do {
            institution = institutions[Math.floor(Math.random() * institutions.length)];
        } while (usedInstitutions.has(institution.address));
        
        usedInstitutions.add(institution.address);
        
        accreditations.push({
            institution: {
                address: institution.address,
                name: institution.name,
                logo: institution.logo,
                verified: institution.verified
            },
            message: messages[Math.floor(Math.random() * messages.length)],
            timestamp: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)
        });
    }
    
    return accreditations;
}

// 生成竞拍历史
function generateBidHistory(): Array<{
    bidder: Collector;
    amount: string;
    timestamp: number;
}> {
    const bidHistory = [];
    const count = Math.floor(Math.random() * 5) + 1; // 1-5个竞拍记录
    let lastAmount = parseEther("0.1"); // 起拍价0.1 ETH
    const usedBidders = new Set<string>();
    
    for (let i = 0; i < count; i++) {
        let bidder;
        do {
            bidder = collectors[Math.floor(Math.random() * collectors.length)];
        } while (usedBidders.has(bidder.address));
        
        usedBidders.add(bidder.address);
        
        // 每次加价10-30%
        const increment = lastAmount * BigInt(Math.floor(Math.random() * 20 + 10)) / BigInt(100);
        lastAmount = lastAmount + increment;
        
        bidHistory.push({
            bidder,
            amount: lastAmount.toString(),
            timestamp: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)
        });
    }
    
    return bidHistory.sort((a, b) => b.timestamp - a.timestamp);
}

// 生成单个NFT测试数据
function generateNFTData(): NFTTestData {
    const kind = artTypes[Math.floor(Math.random() * artTypes.length)];
    const style = artStyles[Math.floor(Math.random() * artStyles.length)];
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const status = ['listed', 'auction', 'sold', 'unlisted'][Math.floor(Math.random() * 4)] as 'listed' | 'auction' | 'sold' | 'unlisted';
    const creator = institutions[Math.floor(Math.random() * institutions.length)];
    const createdAt = Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000);

    return {
        id: `NFT_${Math.random().toString(36).substr(2, 9)}`,
        name: `${style}·${theme}`,
        kind,
        description: generateDescription(kind, style, theme),
        imageUrl: `https://gateway.pinata.cloud/ipfs/bafybeig7ts2xb2jn435bzfyarlxkjhh7ucohsyhjvgln763erpn7omsvwe`,
        royaltyFee: Math.floor(Math.random() * 9) + 1,
        creator,
        price: parseEther((Math.random() * 10).toFixed(2)).toString(),
        status,
        bidHistory: status === 'auction' ? generateBidHistory() : undefined,
        accreditations: Math.random() > 0.5 ? generateAccreditations() : undefined,
        attributes: generateAttributes(kind, style, theme),
        createdAt,
        lastUpdated: createdAt + Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
        views: Math.floor(Math.random() * 10000),
        likes: Math.floor(Math.random() * 1000),
        shares: Math.floor(Math.random() * 500)
    };
}

// 生成多个NFT测试数据
function generateNFTDataSet(count: number): NFTTestData[] {
    const dataset = [];
    for (let i = 0; i < count; i++) {
        dataset.push(generateNFTData());
    }
    return dataset;
}

module.exports = {
    generateNFTData,
    generateNFTDataSet
};

// 使用示例
// const testData = generateNFTDataSet(10); // 生成10个测试数据 