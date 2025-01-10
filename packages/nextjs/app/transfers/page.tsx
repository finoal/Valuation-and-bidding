"use client";

import type { NextPage } from "next";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

const Transfers: NextPage = () => {
  const { data: transferEvents, isLoading } = useScaffoldEventHistory({
    contractName: "YourCollectible",
    eventName: "NftPurchased",
    // Specify the starting block number from which to read events, this is a bigint.
    fromBlock: 0n,
  });

  if (isLoading)
    return (
      <div className="flex justify-center items-center mt-10">
        <span className="loading loading-spinner loading-xl"></span>
      </div>
    );

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">All Transfers Events</span>
          </h1>
        </div>
        <div className="overflow-x-auto shadow-lg">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th className="bg-primary">Transaction ID</th>
                <th className="bg-primary">Timestamp</th>
                <th className="bg-primary">Token Id</th>
                <th className="bg-primary">From</th>
                <th className="bg-primary">To</th>
                <th className="bg-primary">prine</th>
              </tr>
            </thead>
            <tbody>
              {!transferEvents || transferEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center">
                    No events found
                  </td>
                </tr>
              ) : (
                transferEvents?.map((event, index) => {
                  return (
                    <tr key={index}>
                      {/* 使用 .toString() 转换 transactionId 为字符串 */}
                      <th className="text-center">{event.args.transactionId?.toString()}</th>
                      {/* 显式转换 timestamp 为数字并显示 */}
                      <td className="text-center">{new Date(Number(event.args.timestamp) * 1000).toLocaleString()}</td>
                      <th className="text-center">{event.args.tokenId?.toString()}</th>
                      <td>
                        <Address address={event.args.buyer} />
                      </td>
                      <td>
                        <Address address={event.args.seller} />
                      </td>
                      <th className="text-center">{(Number(event.args.price) / 1e18).toFixed(4)} ETH</th>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default Transfers;
