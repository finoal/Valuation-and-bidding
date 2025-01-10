"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
// 使用 Next.js 的 useRouter 来跳转页面
import { useAccount } from "wagmi";
import { useAuth } from "~~/components/AuthContext";
import { useScaffoldContract } from "~~/hooks/scaffold-eth";
// 合约读取
import { notification } from "~~/utils/scaffold-eth";

const LoginPage: React.FC = () => {
  const [userName, setUserName] = useState<string>(""); // 用户名
  const [password, setPassword] = useState<string>(""); // 密码
  const [loading, setLoading] = useState<boolean>(false); // 加载状态
  const { address } = useAccount(); // 获取当前账户地址
  const { setIsAuthenticated, setIsAccrediting } = useAuth(); // 全局登录状态
  const router = useRouter(); // 页面跳转

  const { data: yourContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  const handleLogin = async () => {
    if (!userName || !password) {
      notification.error("请输入用户名和密码。");
      return;
    }

    setLoading(true);
    try {
      const notificationId = notification.loading("正在登录...");
      const validAddress: `0x${string}` = address ?? "0x0000000000000000000000000000000000000000";
      const loginResult = await yourContract?.read.verifyPwd([validAddress, userName, password]); // 调用合约的 verifyPwd 方法

      if (loginResult?.[0]) {
        notification.success("登录成功！");
        setIsAuthenticated(true); // 更新全局登录状态
        notification.remove(notificationId);

        // 跳转到对应页面
        const isAccrediting = loginResult?.[1];
        setIsAccrediting(isAccrediting); // 更新用户角色状态
        router.push(isAccrediting ? "/createNft" : "/myNFTs");
      } else {
        notification.error("用户名或密码错误。");
        setIsAuthenticated(false);
      }
    } catch (error) {
      notification.error("登录失败，请稍后再试。");
      console.error("登录错误:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-blue-500 to-green-500">
      <div className="flex justify-center items-center flex-col p-8 bg-white shadow-xl rounded-xl w-full sm:w-96 animate__animated animate__fadeIn">
        <h1 className="text-3xl font-semibold text-center text-gray-800 mb-6">登录</h1>
        <input
          type="text"
          placeholder="请输入用户名"
          value={userName}
          onChange={e => setUserName(e.target.value)}
          className="input input-bordered w-full mb-4 p-4 rounded-xl"
        />
        <input
          type="password"
          placeholder="请输入密码"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="input input-bordered w-full mb-4 p-4 rounded-xl"
        />
        <button
          onClick={handleLogin}
          className="btn btn-primary w-full"
          disabled={loading}
        >
          {loading ? "登录中..." : "登录"}
        </button>
        <div className="text-center">
          <p className="text-sm text-gray-600">
            没有账号？ <a href="/register" className="text-blue-500 hover:underline">去注册</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
