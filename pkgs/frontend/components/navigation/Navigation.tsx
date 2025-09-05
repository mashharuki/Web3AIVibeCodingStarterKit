"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ConnectionStatus } from "@/components/wallet/ConnectionStatus";
import { NetworkSwitcher } from "@/components/wallet/NetworkSwitcher";
import { WalletConnector } from "@/components/wallet/WalletConnector";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, BarChart3, Droplets, Home, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * ナビゲーションアイテムの型定義
 */
interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

/**
 * ナビゲーションアイテムの定義
 */
const navigationItems: NavigationItem[] = [
  {
    name: "スワップ",
    href: "/",
    icon: Home,
    description: "トークンをスワップ",
  },
  {
    name: "流動性",
    href: "/liquidity",
    icon: Droplets,
    description: "流動性を提供・管理",
  },
  {
    name: "プール",
    href: "/pools",
    icon: BarChart3,
    description: "全プールを表示",
  },
];

/**
 * ナビゲーションリンクコンポーネント
 */
interface NavigationLinkProps {
  item: NavigationItem;
  isActive: boolean;
  onClick?: () => void;
  className?: string;
}

function NavigationLink({ item, isActive, onClick, className }: NavigationLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent",
        className
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{item.name}</span>
    </Link>
  );
}

/**
 * デスクトップナビゲーションコンポーネント
 */
function DesktopNavigation() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center space-x-1">
      {navigationItems.map((item) => (
        <NavigationLink
          key={item.href}
          item={item}
          isActive={pathname === item.href}
          className="px-4 py-2"
        />
      ))}
    </nav>
  );
}

/**
 * モバイルナビゲーションコンポーネント
 */
function MobileNavigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">メニューを開く</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <div className="flex flex-col h-full">
          {/* ロゴ */}
          <div className="flex items-center gap-2 px-2 py-4 border-b">
            <ArrowLeftRight className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">AMM DEX</span>
          </div>

          {/* ナビゲーションメニュー */}
          <nav className="flex-1 py-4">
            <div className="space-y-1">
              {navigationItems.map((item) => (
                <div key={item.href} className="px-2">
                  <NavigationLink
                    item={item}
                    isActive={pathname === item.href}
                    onClick={handleLinkClick}
                    className="w-full"
                  />
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1 ml-7">{item.description}</p>
                  )}
                </div>
              ))}
            </div>
          </nav>

          {/* ウォレット情報 */}
          <div className="border-t pt-4 space-y-4">
            <div className="px-2">
              <ConnectionStatus />
            </div>
            <div className="px-2">
              <NetworkSwitcher />
            </div>
            <div className="px-2">
              <WalletConnector />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * メインナビゲーションコンポーネント
 *
 * デスクトップとモバイルの両方に対応したナビゲーションを提供
 */
export function Navigation() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* ロゴ */}
          <div className="flex items-center gap-2">
            <MobileNavigation />
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeftRight className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">AMM DEX</span>
            </Link>
          </div>

          {/* デスクトップナビゲーション */}
          <DesktopNavigation />

          {/* ウォレット接続 / テーマ切替 */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <NetworkSwitcher />
            </div>
            <ThemeToggle />
            <WalletConnector />
          </div>
        </div>
      </div>
    </header>
  );
}
