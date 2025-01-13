"use client";

import { MyHoldings } from "./_components";
import type { NextPage } from "next";

const MyNFTs: NextPage = () => {
  return (
    <>
      <div className="flex items-center flex-col pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">我的拍品</span>
          </h1>
        </div>
      </div>
      <MyHoldings />
    </>
  );
};

export default MyNFTs;
