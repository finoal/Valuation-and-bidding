"use client";

import type { NextPage } from "next";
import { PowerNFTManagement } from "./_components/PowerNFTManagement";

const PowerPage: NextPage = () => {
  return (
    <>
      <div className="flex items-center flex-col pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">拍品管理</span>
          </h1>
        </div>
      </div>
      <PowerNFTManagement />
    </>
  );
};

export default PowerPage;
