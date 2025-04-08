"use client";

import React, { useRef, useState, useEffect } from "react";
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
  BanknotesIcon,
  CircleStackIcon,
  PowerIcon,
  UserPlusIcon,
  CurrencyDollarIcon,
  BellIcon,
  BellAlertIcon
} from "@heroicons/react/24/outline";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useAuth } from "./AuthContext";

// 定义分类枚举类型
type MenuCategory = 'common' | 'collector' | 'institution' | 'public' | 'auth' | 'dev';

// 消息类型定义
interface Message {
  id: string;
  content: string;
  timestamp: number;
  read: boolean;
}

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
  
  // 消息管理
  const [messages, setMessages] = useState<Message[]>([]);
  const [showMessages, setShowMessages] = useState(false);
  
  // 标记消息为已读
  const markAsRead = (id: string) => {
    setMessages(prev => 
      prev.map(msg => msg.id === id ? {...msg, read: true} : msg)
    );
  };
  
  // 标记所有消息为已读
  const markAllAsRead = () => {
    setMessages(prev => prev.map(msg => ({...msg, read: true})));
  };
  
  // 删除消息
  const deleteMessage = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };
  
  // 获取未读消息数量
  const unreadCount = messages.filter(msg => !msg.read).length;

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
          label: "仪表盘",
          href: "/dashboard",
          condition: isAuthenticated,
          icon: <CircleStackIcon className="h-5 w-5" />,
          category: "collector"
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

  // 消息面板组件
  const MessagePanel = () => {
    if (!showMessages) return null;
    
    return (
      <div className="absolute right-0 top-16 mt-2 w-80 bg-base-100 shadow-xl rounded-box p-4 z-50">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold">系统消息</h3>
          <div className="flex gap-2">
            {messages.length > 0 && (
              <button 
                className="btn btn-xs btn-ghost" 
                onClick={markAllAsRead}
              >
                全部标为已读
              </button>
            )}
            <button 
              className="btn btn-xs btn-ghost" 
              onClick={() => setShowMessages(false)}
            >
              关闭
            </button>
          </div>
        </div>
        
        <div className="divider my-1"></div>
        
        {messages.length === 0 ? (
          <div className="text-center py-4 text-base-content opacity-70">
            暂无消息
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {messages.map(msg => (
              <div 
                key={msg.id} 
                className={`p-3 mb-2 rounded-lg ${msg.read ? 'bg-base-200' : 'bg-base-300'} relative`}
              >
                <div className="pr-6">
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {new Date(msg.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="absolute right-2 top-2 flex flex-col gap-1">
                  {!msg.read && (
                    <button 
                      className="btn btn-xs btn-circle btn-ghost" 
                      onClick={() => markAsRead(msg.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  )}
                  <button 
                    className="btn btn-xs btn-circle btn-ghost" 
                    onClick={() => deleteMessage(msg.id)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
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
          if (showDivider) {
            lastCategory = category as MenuCategory || null;
          }
  
          return (
            <React.Fragment key={`mobile-${label}`}>
              {showDivider && <div className="divider my-2"></div>}
              <li>
                {href ? (
                  <Link
                    href={href}
                    passHref
                    className={`${
                      isActive ? "bg-secondary shadow-md" : ""
                    } hover:bg-secondary hover:shadow-md focus:!bg-secondary active:!text-neutral py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col items-center`}
                    onClick={() => setIsDrawerOpen(false)}
                  >
                    {icon}
                    <span>{label}</span>
                  </Link>
                ) : (
                  <button
                    className="hover:bg-secondary hover:shadow-md focus:!bg-secondary py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col items-center"
                    onClick={() => {
                      if (onClick) onClick();
                      setIsDrawerOpen(false);
                    }}
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
  
  // 使用useEffect监听全局事件来添加消息
  useEffect(() => {
    // 定义一个全局事件处理函数，接收消息内容
    const handleAddMessage = (event: CustomEvent) => {
      const { message } = event.detail;
      if (message) {
        const newMessage: Message = {
          id: Date.now().toString(),
          content: message,
          timestamp: Date.now(),
          read: false
        };
        setMessages(prev => [newMessage, ...prev]);
      }
    };

    // 添加全局事件监听器
    window.addEventListener('addSystemMessage' as any, handleAddMessage as EventListener);
    
    return () => {
      // 清理事件监听器
      window.removeEventListener('addSystemMessage' as any, handleAddMessage as EventListener);
    };
  }, []);

  return (
    <div className="sticky lg:static top-0 navbar min-h-0 flex-shrink-0 justify-between z-20 px-0 sm:px-2 md:px-4 shadow-md shadow-secondary">
      <div className="navbar-start w-auto lg:w-1/2">
        <div className="lg:hidden dropdown" ref={burgerMenuRef}>
          <div
            tabIndex={0}
            className="btn btn-ghost"
            onClick={() => {
              setIsDrawerOpen(!isDrawerOpen);
            }}
          >
            <Bars3Icon className="h-8 w-8" />
          </div>
          {isDrawerOpen && (
            <ul
              tabIndex={0}
              className="menu menu-compact dropdown-content mt-3 p-4 shadow bg-base-100 rounded-box w-72"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <MobileHeaderMenuLinks />
            </ul>
          )}
        </div>
        <Link href="/" passHref className="hidden lg:flex items-center gap-2 ml-4 mr-6 shrink-0">
          <div className="flex flex-col">
            <span className="font-bold leading-tight text-xl"></span>
            <span className="text-xs">价值评估与竞价</span>
          </div>
        </Link>
        <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="navbar-end flex-grow mr-4">
        {isAuthenticated && (
          <div className="relative mr-4">
            <button 
              className="btn btn-circle btn-ghost relative"
              onClick={() => setShowMessages(!showMessages)}
            >
              {unreadCount > 0 ? (
                <>
                  <BellAlertIcon className="h-6 w-6" />
                  <span className="absolute top-1 right-1 bg-error text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </>
              ) : (
                <BellIcon className="h-6 w-6" />
              )}
            </button>
            {showMessages && <MessagePanel />}
          </div>
        )}
        <RainbowKitCustomConnectButton />
        <FaucetButton />
      </div>
    </div>
  );
};
