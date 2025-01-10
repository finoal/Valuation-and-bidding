"use client";

import { useEffect, useState } from "react";
import { NFTCard } from "./NFTCard";
import { useAccount } from "wagmi";
import { useScaffoldContract, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { getMetadataFromIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import { NFTMetaData } from "~~/utils/simpleNFT/nftsMetadata";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

export interface Collectible extends Partial<NFTMetaData> {
  id: number;
  uri: string;
  owner: string;
  transactionRecords?: {
    transactionId: string;
    timestamp: string;
    price: string;
    from: string;
    to: string;
  }[];
}

export const MyHoldings = () => {
  const { address: connectedAddress } = useAccount();
  const [myAllCollectibles, setMyAllCollectibles] = useState<Collectible[]>([]);
  const [allCollectiblesLoading, setAllCollectiblesLoading] = useState(false);

  const { data: yourCollectibleContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  const { data: myTotalBalance } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "balanceOf",
    args: [connectedAddress],
    watch: true,
  });

  // 获取特定NFT的交易记录
  const { data: nftTransactionEvents, isLoading: transactionLoading } = useScaffoldEventHistory({
    contractName: "YourCollectible",
    eventName: "NftPurchased",
    fromBlock: 0n,
  });

  useEffect(() => {
    const updateMyCollectibles = async (): Promise<void> => {
      if (myTotalBalance === undefined || yourCollectibleContract === undefined || connectedAddress === undefined)
        return;

      setAllCollectiblesLoading(true);
      const collectibleUpdate: Collectible[] = [];
      const totalBalance = parseInt(myTotalBalance.toString());
      for (let tokenIndex = 0; tokenIndex < totalBalance; tokenIndex++) {
        try {
          const tokenId = await yourCollectibleContract.read.tokenOfOwnerByIndex([connectedAddress, BigInt(tokenIndex)]);
          const tokenURI = await yourCollectibleContract.read.tokenURI([tokenId]);

          // const ipfsHash = tokenURI.replace("https://ipfs.io/ipfs/", "");
          const nftMetadata: NFTMetaData = await getMetadataFromIPFS(tokenURI as string);

          // 获取交易记录（根据 tokenId 过滤）
          const tokenTransactions =
            nftTransactionEvents?.filter(event => {
              console.log(event.args); // 调试输出事件参数，查看实际字段
              return event.args.tokenId.toString() === tokenId.toString();
            }) || [];

          const transactionRecords = tokenTransactions.map(event => {
            // 强制转换类型，确保处理 BigInt
            const timestamp = new Date(Number(event.args.timestamp) * 1000).toLocaleString();
            const price = (Number(event.args.price) / 1e18).toFixed(4) + " ETH"; // 假设 price 为 BigInt，转换为 ETH
            return {
              transactionId: event.args.transactionId?.toString(),
              timestamp,
              price,
              from: event.args.buyer,
              to: event.args.seller,
            };
          });

          collectibleUpdate.push({
            id: parseInt(tokenId.toString()),
            uri: tokenURI,
            owner: connectedAddress,
            ...nftMetadata,
            transactionRecords, // 加入交易记录
          });
        } catch (e) {
          notification.error("Error fetching all collectibles");
          setAllCollectiblesLoading(false);
          console.log(e);
        }
      }
      collectibleUpdate.sort((a, b) => a.id - b.id);
      setMyAllCollectibles(collectibleUpdate);
      setAllCollectiblesLoading(false);
    };

    updateMyCollectibles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedAddress, myTotalBalance, nftTransactionEvents]);

  if (allCollectiblesLoading || transactionLoading)
    return (
      <div className="flex justify-center items-center mt-10">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );

  return (
    <>
      {myAllCollectibles.length === 0 ? (
        <div className="flex justify-center items-center mt-10">
          <div className="text-2xl text-primary-content">No NFTs found</div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 my-8 px-5 justify-center">
          {myAllCollectibles.map(item => (
            <div key={item.id} className="flex flex-col items-center">
              <NFTCard nft={item} />
              {item.transactionRecords?.length > 0 && (
                <div className="mt-4 w-full">
                  <h3 className="font-bold text-lg">Transaction History:</h3>
                  <table className="table table-zebra w-full">
                    <thead>
                      <tr>
                        <th>Transaction ID</th>
                        <th>Timestamp</th>
                        <th>Price</th>
                        <th>From</th>
                        <th>To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.transactionRecords.map((record, index) => (
                        <tr key={index}>
                          <td>{record.transactionId}</td>
                          <td>{record.timestamp}</td>
                          <td>{record.price}</td>
                          <td>{record.from}</td>
                          <td>{record.to}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};
