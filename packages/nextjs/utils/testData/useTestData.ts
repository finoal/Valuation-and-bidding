import { useState, useEffect } from 'react';
import nftTestData from './nftTestData.json';

export interface NFTData {
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

interface FilterOptions {
    status?: 'listed' | 'auction' | 'sold' | 'unlisted';
    kind?: string;
    priceRange?: {
        min: string;
        max: string;
    };
    creator?: string;
    hasAccreditation?: boolean;
}

interface NFTStatistics {
    total: number;
    byStatus: {
        listed: number;
        auction: number;
        sold: number;
        unlisted: number;
    };
    byType: Record<string, number>;
    averagePrice: number;
    averageRoyaltyFee: number;
    totalAccreditations: number;
    totalBids: number;
}

interface UserActivity {
    createdNFTs: NFTData[];
    bids: Array<{
        nft: NFTData;
        bid: NonNullable<NFTData['bidHistory']>[number];
    }>;
    ownedNFTs: NFTData[];
    accreditedNFTs: Array<{
        nft: NFTData;
        accreditation: NonNullable<NFTData['accreditations']>[number];
    }>;
}

// 模拟API延迟
const simulateDelay = () => new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 500));

// 获取NFT列表，支持过滤和分页
export function useNFTTestData(options?: FilterOptions, page = 1, pageSize = 10) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<NFTData[]>([]);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            await simulateDelay();

            let filteredData = [...nftTestData] as NFTData[];

            // 应用过滤条件
            if (options) {
                if (options.status) {
                    filteredData = filteredData.filter(nft => nft.status === options.status);
                }
                if (options.kind) {
                    filteredData = filteredData.filter(nft => nft.kind === options.kind);
                }
                if (options.priceRange) {
                    filteredData = filteredData.filter(nft => {
                        if (!nft.price) return false;
                        const price = BigInt(nft.price);
                        return price >= BigInt(options.priceRange!.min) && price <= BigInt(options.priceRange!.max);
                    });
                }
                if (options.creator) {
                    filteredData = filteredData.filter(nft => nft.creator.address.toLowerCase() === options.creator!.toLowerCase());
                }
                if (options.hasAccreditation !== undefined) {
                    filteredData = filteredData.filter(nft => 
                        options.hasAccreditation ? 
                            (nft.accreditations && nft.accreditations.length > 0) : 
                            (!nft.accreditations || nft.accreditations.length === 0)
                    );
                }
            }

            // 计算总数
            setTotal(filteredData.length);

            // 应用分页
            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            filteredData = filteredData.slice(start, end);

            setData(filteredData);
            setLoading(false);
        };

        fetchData();
    }, [options, page, pageSize]);

    return { data, loading, total };
}

// 获取单个NFT详情及相关NFT
export function useNFTDetails(id: string) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<NFTData | null>(null);
    const [relatedNFTs, setRelatedNFTs] = useState<NFTData[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            await simulateDelay();

            const nft = (nftTestData as NFTData[]).find(n => n.id === id);
            if (nft) {
                setData(nft);

                // 获取相关NFT（同类型或同一创作者的其他作品）
                const related = (nftTestData as NFTData[])
                    .filter(n => n.id !== id && (n.kind === nft.kind || n.creator.address === nft.creator.address))
                    .slice(0, 4);
                setRelatedNFTs(related);
            }

            setLoading(false);
        };

        fetchData();
    }, [id]);

    return { data, loading, relatedNFTs };
}

// 获取NFT统计信息
export function useNFTStatistics(): { data: NFTStatistics | null; loading: boolean } {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<NFTStatistics | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            await simulateDelay();

            const nfts = nftTestData as NFTData[];
            const stats: NFTStatistics = {
                total: nfts.length,
                byStatus: {
                    listed: nfts.filter(nft => nft.status === 'listed').length,
                    auction: nfts.filter(nft => nft.status === 'auction').length,
                    sold: nfts.filter(nft => nft.status === 'sold').length,
                    unlisted: nfts.filter(nft => nft.status === 'unlisted').length
                },
                byType: nfts.reduce((acc, nft) => {
                    acc[nft.kind] = (acc[nft.kind] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>),
                averagePrice: nfts
                    .filter(nft => nft.price)
                    .reduce((sum, nft) => sum + Number(nft.price), 0) / nfts.filter(nft => nft.price).length,
                averageRoyaltyFee: nfts.reduce((sum, nft) => sum + nft.royaltyFee, 0) / nfts.length,
                totalAccreditations: nfts.reduce((sum, nft) => sum + (nft.accreditations?.length || 0), 0),
                totalBids: nfts.reduce((sum, nft) => sum + (nft.bidHistory?.length || 0), 0)
            };

            setData(stats);
            setLoading(false);
        };

        fetchData();
    }, []);

    return { data, loading };
}

// 获取用户活动信息
export function useUserActivity(address: string): { data: UserActivity | null; loading: boolean } {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<UserActivity | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            await simulateDelay();

            const nfts = nftTestData as NFTData[];
            const activity: UserActivity = {
                createdNFTs: nfts.filter(nft => nft.creator.address.toLowerCase() === address.toLowerCase()),
                bids: nfts.flatMap(nft => 
                    (nft.bidHistory || [])
                        .filter(bid => bid.bidder.address.toLowerCase() === address.toLowerCase())
                        .map(bid => ({ nft, bid }))
                ),
                ownedNFTs: nfts.filter(nft => 
                    nft.status === 'sold' && 
                    nft.bidHistory && 
                    nft.bidHistory[nft.bidHistory.length - 1].bidder.address.toLowerCase() === address.toLowerCase()
                ),
                accreditedNFTs: nfts.flatMap(nft =>
                    (nft.accreditations || [])
                        .filter(acc => acc.institution.address.toLowerCase() === address.toLowerCase())
                        .map(accreditation => ({ nft, accreditation }))
                )
            };

            setData(activity);
            setLoading(false);
        };

        fetchData();
    }, [address]);

    return { data, loading };
} 