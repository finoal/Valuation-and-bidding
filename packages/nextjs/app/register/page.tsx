"use client";

import { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { useRouter } from "next/navigation"; // 使用 Next.js 的 useRouter 来跳转页面

const RegisterPage: React.FC = () => {
  const { writeContractAsync } = useScaffoldWriteContract("YourCollectible"); // 获取合约调用函数
  const router = useRouter(); // 页面跳转

  // 页面状态管理
  const [userName, setUserName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>(""); // 确认密码
  const [bio, setBio] = useState<string>("");
  const [isAccrediting, setIsAccrediting] = useState<boolean>(false); // 判断是否为鉴定机构

  // 处理注册逻辑
  const handleRegister = async () => {
    if (!userName || !password || !bio || !confirmPassword) {
      notification.error("所有字段均为必填项。");
      return;
    }

    if (password !== confirmPassword) {
      notification.error("密码和确认密码不匹配。");
      return;
    }

    try {
      const notificationId = notification.loading("正在注册用户...");

      // 调用智能合约的 registerUser 方法
      await writeContractAsync({
        functionName: "registerUser",
        args: [userName, password, bio, isAccrediting],
      });

      notification.success("用户注册成功！");
      notification.remove(notificationId);
      router.push("/login"); // 注册成功后跳转到登录页面
    } catch (error) {
      notification.error("注册失败。");
      console.error(error);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-blue-500 to-green-500">
      <div className="flex justify-center items-center flex-col p-8 bg-white shadow-xl rounded-xl w-full sm:w-96 animate__animated animate__fadeIn">
        <h1 className="text-3xl font-semibold text-center text-gray-800 mb-6">注册</h1>

        {/* 用户名输入框 */}
        <input
          type="text"
          placeholder="请输入用户名"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className="input input-bordered w-full mb-4 p-4 rounded-xl shadow-md border-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition duration-300 ease-in-out transform focus:scale-105 focus:shadow-xl"
        />

        {/* 密码输入框 */}
        <input
          type="password"
          placeholder="请输入密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input input-bordered w-full mb-4 p-4 rounded-xl shadow-md border-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition duration-300 ease-in-out transform focus:scale-105 focus:shadow-xl"
        />

        {/* 确认密码输入框 */}
        <input
          type="password"
          placeholder="确认密码"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="input input-bordered w-full mb-4 p-4 rounded-xl shadow-md border-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition duration-300 ease-in-out transform focus:scale-105 focus:shadow-xl"
        />

        {/* 个人简介输入框 */}
        <input
          type="text"
          placeholder="请输入个人简介"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="input input-bordered w-full mb-4 p-4 rounded-xl shadow-md border-2 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition duration-300 ease-in-out transform focus:scale-105 focus:shadow-xl"
        />

        {/* 鉴定机构选择框 */}
        <label className="label cursor-pointer mb-4 flex items-center">
          <span className="label-text text-gray-700 text-lg mr-2">注册为鉴定机构</span>
          <input
            type="checkbox"
            checked={isAccrediting}
            onChange={() => setIsAccrediting(!isAccrediting)}
            className="checkbox checkbox-primary transition duration-300 transform hover:scale-110"
          />
        </label>

        {/* 注册按钮 */}
        <button
          onClick={handleRegister}
          className="btn btn-primary w-full p-4 rounded-xl text-white text-xl mb-4 grid place-items-center hover:bg-[#30a0b2] transition duration-300 ease-in-out transform hover:scale-105"
        >
          注册
        </button>

        {/* 切换到登录页 */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            已有账号？{" "}
            <a href="/login" className="text-blue-500 hover:underline">
              去登录
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
