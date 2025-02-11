"use client";

import { useEffect, useState } from "react";
import { useScaffoldContract } from "~~/hooks/scaffold-eth";
import { useAccount } from "wagmi";
import { getMetadataFromIPFS } from "~~/utils/simpleNFT/ipfs-fetch";
import { notification } from "~~/utils/scaffold-eth";

export interface Institution {
  username: string;
  description: string;
  integral: number;
  certificate: string[];
  name: string;
  desc: string;
}

const AssessInstitution = () => {
  const { address: connectedAddress } = useAccount(); // 获取钱包地址
  const [institution, setInstitution] = useState<Institution | null>(null); // 单个鉴定机构数据
  const [loading, setLoading] = useState<boolean>(false); // 加载状态
  const [fetchCompleted, setFetchCompleted] = useState<boolean>(false); // 防止重复加载

  const { data: yourCollectibleContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  // 数据加载函数
  const fetchInstitutionData = async () => {
    if (!connectedAddress || !yourCollectibleContract || fetchCompleted) return; // 防止重复调用

    setLoading(true); // 开始加载

    try {
      // 获取用户信息
      const [name, bio, integral, assessUri] = await yourCollectibleContract.read.getUserMessage([connectedAddress]);

      // 获取 IPFS 元数据
      let certificates: string[] = [];
      let meta = "";
      let desc = "";
      if (assessUri) {
        const metadata = await getMetadataFromIPFS(assessUri as string);
        console.log("metadata", metadata);
        certificates = metadata.certificate || [];
        meta = metadata.name;
        desc = metadata.description;
      }

      // 设置机构数据
      setInstitution({
        name,
        description: bio,
        integral: Number(integral),
        certificate: certificates,
        username: meta,
        desc: desc,
      });

      setFetchCompleted(true); // 标记为已加载
    } catch (error) {
      console.error("Failed to fetch institution data", error);
      notification.error("无法获取鉴定机构信息！");
    } finally {
      setLoading(false); // 结束加载
    }
  };

  useEffect(() => {
    // 确保只在首次加载时调用 fetchInstitutionData
    if (connectedAddress && yourCollectibleContract && !fetchCompleted) {
      fetchInstitutionData();
    }
  }, [connectedAddress, yourCollectibleContract, fetchCompleted]); // 依赖项是 address 和 contract

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-blue-500 to-green-500">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );

  // 如果没有获取到数据，显示提示
  if (!institution)
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-blue-500 to-green-500">
        <p className="text-2xl text-white">暂无可展示的鉴定机构信息。</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 to-green-500 p-8">
      <h1 className="text-4xl font-bold text-center text-white mb-8">鉴定机构信息展示</h1>
      <div className="bg-white shadow-xl rounded-xl p-6 max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-2">{institution.username}</h2>
        <p className="text-gray-700 mb-4">{institution.description}</p>
        <p className="text-lg font-medium text-blue-600 mb-4">积分: {institution.integral}</p>
        <p className="text-gray-700 mb-4">
          机构名称：{institution.name == "" ? "未添加机构名称信息" : institution.name}
        </p>
        <p className="text-gray-700 mb-4">机构介绍：{institution.desc}</p>
        <div className="flex flex-wrap gap-2">
          {institution.certificate.length > 0 ? (
            institution.certificate.map((image, idx) => (
              <img
                key={idx}
                src={image}
                alt={`Certificate ${idx + 1}`}
                className="w-24 h-24 object-cover rounded-lg shadow-md"
              />
            ))
          ) : (
            <p className="text-gray-500">暂无证书信息。</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessInstitution;
