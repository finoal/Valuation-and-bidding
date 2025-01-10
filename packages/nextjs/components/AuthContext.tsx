"use client";

import React, { createContext, useContext, useState } from "react";

// 更新状态：添加 isAuthenticated 和 isAccrediting
interface AuthContextProps {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  isAccrediting: boolean;
  setIsAccrediting: (value: boolean) => void;
  // logout: () => void; // 添加退出登录的方法
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAccrediting, setIsAccrediting] = useState<boolean>(false);

  // // 退出登录的逻辑：清除状态，跳转到登录页面
  // const logout = () => {
  //   setIsAuthenticated(false);
  //   setIsAccrediting(false);
  //   localStorage.removeItem("userData"); // 可选：清除本地存储的用户数据
  // };

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, isAccrediting, setIsAccrediting }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
