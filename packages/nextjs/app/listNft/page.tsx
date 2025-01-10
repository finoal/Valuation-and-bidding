"use client";
import { useState, useEffect } from "react";
import type { NextPage } from "next";
import { notification } from "~~/utils/scaffold-eth";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { parseEther } from "viem";

const ListNFT: NextPage = () => {
  const { address } = useAccount();
  const [tokenId, setTokenId] = useState("");
  const [price, setPrice] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [listingFee, setListingFee] = useState<bigint>(BigInt(0));
  const [royaltyFee, setRoyaltyFee] = useState<bigint>(BigInt(0));
  const [isCreator, setIsCreator] = useState(false);

  const { data: ownerOf } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "ownerOf",
    args: tokenId ? [BigInt(tokenId)] : [undefined],
  });

  const { data: royaltyInfo } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "royaltyInfo",
    args: tokenId ? [BigInt(tokenId), parseEther(price || "0")] : [undefined, undefined],
  });

  const { data: calculatedListingFee } = useScaffoldReadContract({
    contractName: "YourCollectible",
    functionName: "calculateListingFee",
    args: price ? [parseEther(price)] : [undefined],
  });

  const { writeContractAsync: placeNftOnSale, isMining } = useScaffoldWriteContract("YourCollectible");

  useEffect(() => {
    if (ownerOf) {
      setIsOwner(ownerOf.toLowerCase() === address?.toLowerCase());
    }
  }, [ownerOf, address]);

  useEffect(() => {
    if (royaltyInfo) {
      const [creator, fee] = royaltyInfo;
      setIsCreator(creator.toLowerCase() === address?.toLowerCase());
      setRoyaltyFee(fee);
    }
  }, [royaltyInfo, address]);

  useEffect(() => {
    if (calculatedListingFee) {
      setListingFee(calculatedListingFee);
    }
  }, [calculatedListingFee]);

  const handleListNFT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenId || !price) {
      notification.error("Please provide both Token ID and Price.");
      return;
    }
    if (!isOwner) {
      notification.error("You do not own this NFT.");
      return;
    }
    try {
      const tx = await placeNftOnSale({
        functionName: "placeNftOnSale",
        args: [BigInt(tokenId), parseEther(price)],
        value: listingFee,
      });
      if (tx) {
        notification.success("NFT Listed Successfully!");
      } else {
        notification.error("Transaction failed to send.");
      }
    } catch (error) {
      console.error("Error while listing NFT:", error);
      notification.error("Error listing NFT");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-bold mb-4">List NFT for Sale</h2>
        <form onSubmit={handleListNFT}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="tokenId">
              Token ID
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="tokenId"
              type="number"
              placeholder="Enter Token ID"
              value={tokenId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTokenId(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="price">
              Price (in ETH)
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="price"
              type="number"
              step="0.000000000000000001"
              placeholder="Enter Price in ETH"
              value={price}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(e.target.value)}
              required
            />
          </div>

          {isOwner !== null && (
            <div className={`mb-4 p-2 rounded ${isOwner ? "bg-green-100" : "bg-red-100"}`}>
              <p className="text-sm">
                {isOwner
                  ? "You are the owner of this NFT."
                  : "You do not own this NFT and cannot list it."}
              </p>
            </div>
          )}

          {!isCreator && royaltyFee > BigInt(0) && (
            <div className="mb-4 p-2 rounded bg-yellow-100">
              <p className="text-sm">
                You are not the creator of this NFT. You will need to pay {royaltyFee.toString()} Wei as royalty fee.
              </p>
            </div>
          )}

          {listingFee > BigInt(0) && (
            <div className="mb-4 p-2 rounded bg-blue-100">
              <p className="text-sm">
                The listing fee for this NFT is {listingFee.toString()} Wei.
              </p>
            </div>
          )}

          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
            disabled={isMining || !isOwner}
          >
            {isMining ? "Listing..." : "List NFT"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ListNFT;
