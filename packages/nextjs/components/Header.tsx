"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Bars3Icon, 
  HomeIcon,
  SquaresPlusIcon,
  BuildingStorefrontIcon,
  ShoppingBagIcon,
  ClipboardDocumentCheckIcon,
  PencilSquareIcon,
  AcademicCapIcon,
  IdentificationIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftEndOnRectangleIcon,
  BugAntIcon,
  BanknotesIcon,
  CircleStackIcon,
  PowerIcon,
  UserPlusIcon,
  CurrencyDollarIcon
} from "@heroicons/react/24/outline";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useAuth } from "./AuthContext";

// 定义分类枚举类型
type MenuCategory = 'common' | 'collector' | 'institution' | 'public' | 'auth' | 'dev';

type HeaderMenuLink = {
  label: string;
  href?: string; // 可选
  condition?: boolean; // 判断菜单项是否显示的条件
  icon?: React.ReactNode;
  onClick?: () => void; // 点击菜单项时的回调函数
  category?: MenuCategory; // 菜单分类
};

export const Header = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // 管理侧边菜单是否打开
  const { isAuthenticated, isAccrediting, setIsAuthenticated, setIsAccrediting } = useAuth(); // 获取认证状态和退出登录函数
  const burgerMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname(); // 获取当前路径，用于高亮显示菜单
  const router = useRouter(); // 页面跳转

  const logout = () => {
    setIsAuthenticated(false); // 清除登录状态
    setIsAccrediting(false); // 如果有 `isAccrediting` 状态，也需要清除
    router.push("/"); // 强制跳转到主页
  };

  const menuLinks: HeaderMenuLink[] = isAuthenticated
    ? [
        // 通用菜单项
        {
          label: "首页",
          href: "/",
          condition: true,
          icon: <HomeIcon className="h-5 w-5" />,
          category: "common"
        },
        
        // 收藏家菜单项
        {
          label: "仪表盘",
          href: "/dashboard",
          condition: isAuthenticated && !isAccrediting,
          icon: <CircleStackIcon className="h-5 w-5" />,
          category: "collector"
        },
        {
          label: "我的拍品",
          href: "/myNFTs",
          condition: isAuthenticated && !isAccrediting,
          icon: <ShoppingBagIcon className="h-5 w-5" />,
          category: "collector"
        },
        {
          label: "添加拍品",
          href: "/createNft",
          condition: isAuthenticated && !isAccrediting,
          icon: <SquaresPlusIcon className="h-5 w-5" />,
          category: "collector"
        },
        {
          label: "拍卖市场",
          href: "/auction",
          condition: isAuthenticated && !isAccrediting,
          icon: <BuildingStorefrontIcon className="h-5 w-5" />,
          category: "collector"
        },
        
        // 鉴定机构菜单项
        {
          label: "查看机构信息",
          href: "/getUserMessage",
          condition: isAuthenticated && isAccrediting,
          icon: <IdentificationIcon className="h-5 w-5" />,
          category: "institution"
        },
        {
          label: "更新机构信息",
          href: "/userMessage",
          condition: isAuthenticated && isAccrediting,
          icon: <PencilSquareIcon className="h-5 w-5" />,
          category: "institution"
        },
        {
          label: "可鉴定藏品",
          href: "/accreditableNFTs",
          condition: isAuthenticated && isAccrediting,
          icon: <ClipboardDocumentCheckIcon className="h-5 w-5" />,
          category: "institution"
        },
        {
          label: "我的鉴定",
          href: "/myauthmessage",
          condition: isAuthenticated && isAccrediting,
          icon: <AcademicCapIcon className="h-5 w-5" />,
          category: "institution"
        },
        
        // 公共菜单项（已登录用户）
        {
          label: "我的授权",
          href: "/power",
          condition: isAuthenticated,
          icon: <PowerIcon className="h-5 w-5" />,
          category: "public"
        },
        {
          label: "区块链交易",
          href: "/transactions",
          condition: isAuthenticated,
          icon: <BanknotesIcon className="h-5 w-5" />,
          category: "public"
        },
        {
          label: "交易记录",
          href: "/transfers",
          condition: isAuthenticated,
          icon: <CurrencyDollarIcon className="h-5 w-5" />,
          category: "public"
        },
        {
          label: "退出登录",
          href: "",
          condition: isAuthenticated,
          icon: <ArrowRightOnRectangleIcon className="h-5 w-5" />,
          onClick: logout,
          category: "auth"
        },
      ]
    : [
        {
          label: "首页",
          href: "/",
          condition: true,
          icon: <HomeIcon className="h-5 w-5" />,
          category: "common"
        },
        {
          label: "注册",
          href: "/register",
          condition: !isAuthenticated,
          icon: <UserPlusIcon className="h-5 w-5" />,
          category: "auth"
        },
        {
          label: "登录",
          href: "/login",
          condition: !isAuthenticated,
          icon: <ArrowLeftEndOnRectangleIcon className="h-5 w-5" />,
          category: "auth"
        },
        // {
        //   label: "Debug", // 调试选项
        //   href: "/debug",
        //   condition: process.env.NODE_ENV === "development", // 仅在开发环境下显示
        //   icon: <BugAntIcon className="h-5 w-5" />,
        //   category: "dev"
        // },
      ];

  // 对菜单项进行分组展示
  const getMenuGroups = () => {
    if (!isAuthenticated) return menuLinks;
    
    const categoryOrder: Record<MenuCategory, number> = {
      common: 1,
      collector: 2,
      institution: 3,
      public: 4,
      auth: 5,
      dev: 6
    };
    
    const sortByCategory = [...menuLinks].sort((a, b) => {
      const aCat = a.category || 'common';
      const bCat = b.category || 'common';
      return (categoryOrder[aCat] || 99) - (categoryOrder[bCat] || 99);
    });
    
    return sortByCategory;
  };

  const HeaderMenuLinks = () => {
    const groupedLinks = getMenuGroups();
    let lastCategory: MenuCategory | null = null;
    
    return (
      <>
        {groupedLinks.map((link, index) => {
          const { label, href, condition, icon, onClick, category } = link;
          const isActive = pathname === href;
          
          // 如果不满足显示条件，则不显示
          if (condition !== undefined && !condition) return null;
          
          // 检查是否需要添加分隔线
          const showDivider = lastCategory !== category && lastCategory !== null && index > 0;
          lastCategory = category as MenuCategory || null;
          
          return (
            <React.Fragment key={label}>
              {showDivider && <div className="hidden xl:block border-l h-8 mx-2 opacity-30"></div>}
              <li>
                {href ? (
                  <Link
                    href={href}
                    passHref
                    className={`${
                      isActive ? "bg-secondary shadow-md" : ""
                    } hover:bg-secondary hover:shadow-md focus:!bg-secondary active:!text-neutral py-2 px-3 text-sm rounded-full gap-2 grid grid-flow-col items-center transition-all duration-200`}
                  >
                    {icon}
                    <span>{label}</span>
                  </Link>
                ) : (
                  <button
                    onClick={onClick}
                    className="hover:bg-secondary hover:shadow-md focus:!bg-secondary py-2 px-3 text-sm rounded-full gap-2 grid grid-flow-col items-center transition-all duration-200"
                  >
                    {icon}
                    <span>{label}</span>
                  </button>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </>
    );
  };

  // 移动端菜单处理
  const MobileHeaderMenuLinks = () => {
    const groupedLinks = getMenuGroups();
    let lastCategory: MenuCategory | null = null;
    
    return (
      <>
        {groupedLinks.map((link, index) => {
          const { label, href, condition, icon, onClick, category } = link;
          const isActive = pathname === href;
          
          // 如果不满足显示条件，则不显示
          if (condition !== undefined && !condition) return null;
          
          // 检查是否需要添加分隔线
          const showDivider = lastCategory !== category && lastCategory !== null && index > 0;
          lastCategory = category as MenuCategory || null;
          
          return (
            <React.Fragment key={label}>
              {showDivider && <div className="divider my-1 opacity-30"></div>}
              <li>
                {href ? (
                  <Link
                    href={href}
                    passHref
                    className={`${
                      isActive ? "bg-secondary" : ""
                    } hover:bg-secondary py-2 px-4 text-sm gap-2 flex items-center`}
                  >
                    <span className="w-6">{icon}</span>
                    <span>{label}</span>
                  </Link>
                ) : (
                  <button
                    onClick={onClick}
                    className="hover:bg-secondary py-2 px-4 text-sm gap-2 flex items-center w-full text-left"
                  >
                    <span className="w-6">{icon}</span>
                    <span>{label}</span>
                  </button>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </>
    );
  };

  return (
    <div className="sticky xl:static top-0 navbar bg-primary min-h-0 flex-shrink-0 justify-between z-20 shadow-md shadow-secondary px-0 sm:px-2">
      <div className="navbar-start w-auto xl:w-1/2">
        <div className="xl:hidden dropdown" ref={burgerMenuRef}>
          <label
            tabIndex={0}
            className={`ml-1 btn btn-ghost ${isDrawerOpen ? "hover:bg-secondary" : "hover:bg-transparent"}`}
            onClick={() => setIsDrawerOpen(prev => !prev)}
          >
            <Bars3Icon className="h-1/2" />
          </label>
          {isDrawerOpen && (
            <ul
              tabIndex={0}
              className="menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-64"
              onClick={() => setIsDrawerOpen(false)}
            >
              <MobileHeaderMenuLinks />
            </ul>
          )}
        </div>
        <Link href="/" passHref className="hidden xl:flex items-center gap-1 ml-4 mr-6 shrink-0">
          <div className="flex relative w-10 h-10">
            <Image alt="Logo" className="cursor-pointer" fill src="/logo.svg" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold leading-tight">价值评估</span>
            <span className="text-xs">竞价</span>
          </div>
        </Link>
        <ul className="hidden xl:flex xl:flex-nowrap menu menu-horizontal px-1 gap-2">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="navbar-end flex-grow mr-4">
        <RainbowKitCustomConnectButton />
        <FaucetButton />
      </div>
    </div>
  );
};
