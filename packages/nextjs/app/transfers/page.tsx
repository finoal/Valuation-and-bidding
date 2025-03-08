"use client";

import type { NextPage } from "next";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

const Transfers: NextPage = () => {
  const { data: transferEvents, isLoading } = useScaffoldEventHistory({
    contractName: "YourCollectible",
    eventName: "TransactionRecord",
    // Specify the starting block number from which to read events, this is a bigint.
    fromBlock: 0n,
  });
  console.log("222", transferEvents);

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
            <span className="block text-4xl font-bold">交易历史记录</span>
          </h1>
        </div>
        <div className="overflow-x-auto shadow-lg">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th className="bg-primary">交易序号</th>
                <th className="bg-primary">交易时间</th>
                <th className="bg-primary">类型</th>
                <th className="bg-primary">发送者</th>
                <th className="bg-primary">接收者</th>
                <th className="bg-primary">金额 (ETH)</th>
              </tr>
            </thead>
            <tbody>
              {!transferEvents || transferEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center">
                    没有记录
                  </td>
                </tr>
              ) : (
                transferEvents?.map((event, index) => {
                  return (
                    <tr key={index}>
                      <th className="text-center">{event.args.transactionId?.toString()}</th>
                      <td className="text-center">{new Date(Number(event.args.timestamp) * 1000).toLocaleString()}</td>
                      <td className="text-center">{event.args.transactionType}</td>
                      <td>
                        <Address address={event.args.from} />
                      </td>
                      <td>
                        <Address address={event.args.to} />
                      </td>
                      <th className="text-center">{(Number(event.args.amount) / 1e18).toFixed(4)} ETH</th>
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
