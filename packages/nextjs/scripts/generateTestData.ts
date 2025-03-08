const nftTestData = require('../utils/testData/nftTestData');
const fs = require('fs');
const path = require('path');

interface NFTData {
    id: string;
    name: string;
    kind: string;
    description: string;
    imageUrl: string;
    royaltyFee: number;
    creator: {
        address: string;
        name: string;
        avatar: string;
        verified: boolean;
    };
    price?: string;
    status: 'listed' | 'auction' | 'sold' | 'unlisted';
    bidHistory?: Array<{
        bidder: {
            address: string;
            name: string;
            avatar: string;
        };
        amount: string;
        timestamp: number;
    }>;
    accreditations?: Array<{
        institution: {
            address: string;
            name: string;
            logo: string;
            verified: boolean;
        };
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

// 生成100个NFT测试数据
const nftData = nftTestData.generateNFTDataSet(100);

// 确保输出目录存在
const outputDir = path.join(__dirname, '../utils/testData');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// 保存数据到JSON文件
fs.writeFileSync(
    path.join(outputDir, 'nftTestData.json'),
    JSON.stringify(nftData, null, 2)
);

// 计算并输出一些统计信息
const stats = {
    total: nftData.length,
    byStatus: {
        listed: nftData.filter((nft: any) => nft.status === 'listed').length,
        auction: nftData.filter((nft: any) => nft.status === 'auction').length,
        sold: nftData.filter((nft: any) => nft.status === 'sold').length,
        unlisted: nftData.filter((nft: any) => nft.status === 'unlisted').length
    },
    byType: nftData.reduce((acc: Record<string, number>, nft: any) => {
        acc[nft.kind] = (acc[nft.kind] || 0) + 1;
        return acc;
    }, {} as Record<string, number>),
    averagePrice: nftData
        .filter((nft: any) => nft.price)
        .reduce((sum: number, nft: any) => sum + Number(nft.price), 0) / nftData.filter((nft: any) => nft.price).length,
    averageRoyaltyFee: nftData.reduce((sum: number, nft: any) => sum + nft.royaltyFee, 0) / nftData.length,
    totalAccreditations: nftData.reduce((sum: number, nft: any) => sum + (nft.accreditations?.length || 0), 0),
    totalBids: nftData.reduce((sum: number, nft: any) => sum + (nft.bidHistory?.length || 0), 0)
};

console.log('NFT测试数据生成完成！');
console.log('统计信息:', JSON.stringify(stats, null, 2)); 