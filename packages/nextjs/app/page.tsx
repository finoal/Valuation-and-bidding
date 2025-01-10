import Image from "next/image";
import type { NextPage } from "next";

const Home: NextPage = () => {
  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5 w-[90%] md:w-[75%]">
        <h1 className="text-center mb-6">
          <span className="block text-2xl mb-2">Valuation and bidding</span>
          <span className="block text-4xl font-bold">价值评估与竞价：区块链</span>
        </h1>
        <div className="flex flex-col items-center justify-center">
          <Image
            src="/hero.png"
            width="727"
            height="231"
            alt="challenge banner"
            className="rounded-xl border-4 border-primary"
          />
          <div className="max-w-3xl">
            <p className="text-center text-lg mt-8">
              🎫 欢迎来到基于区块链的价值评估与竞价系统！🎉
              <br />
              本项目🏗️旨在打造一个创新的去中心化平台，让用户👷‍♀️能够安全地进行物品&apos;竞拍和价值评估&apos;。
              <br />
              借助区块链技术，
              我们的系统确保每一笔交易都透明、公正，且无法篡改。在这个平台上，用户不仅可以发布拍卖物品，
              还可以通过区块链智能合约进行实时竞标与评估。这将为传统的拍卖与评估行业带来革命性的改变，解决了中介与信任问题，提升了整个交易过程的效率与公平性。🚀
              <br />
              <a href="https://hardhat.org/getting-started/" target="_blank" rel="noreferrer" className="underline">
                🌟 项目特色: 区块链
              </a>{" "}
              <br />
              🔐 &apos;去中心化的拍卖与竞标&apos;：所有的竞标和交易数据都保存在区块链上，透明且不可篡改。💎
              价值评估机制：结合区块链与智能合约，提供可信赖的物品价值评估服务。&apos;高效竞拍&apos;：支持实时竞标，保证竞标过程快速、公正。🚀
            </p>
            <p className="text-center text-lg">
              🌟
              你是否曾经为传统拍卖系统中的信息不对称、信任问题而感到困扰？在这个基于区块链的价值评估与竞价系统中，我们将彻底改变这一切！{" "}
              <br />
              <a href="https://speedrunethereum.com/" target="_blank" rel="noreferrer" className="underline">
                ValuationAndBidding.com
              </a>{" "}
              !
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
