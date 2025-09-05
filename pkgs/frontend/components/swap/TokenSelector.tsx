"use client";

import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Token } from "@/lib/tokens";
import { getAllTokens } from "@/lib/tokens";
import { formatTokenAmount } from "@/utils/formatters";

/**
 * トークン選択コンポーネントのプロパティ
 */
export interface TokenSelectorProps {
  /** 選択されたトークン */
  selectedToken?: Token;
  /** トークン選択時のコールバック */
  onTokenSelect: (token: Token) => void;
  /** 除外するトークン（対向トークンなど） */
  excludeToken?: Token;
  /** トークン残高（表示用） */
  balance?: bigint;
  /** 残高読み込み中かどうか */
  isLoadingBalance?: boolean;
  /** 無効状態かどうか */
  disabled?: boolean;
  /** プレースホルダーテキスト */
  placeholder?: string;
  /** ラベル */
  label?: string;
  /** エラーメッセージ */
  error?: string;
  /** 警告メッセージ */
  warning?: string;
  /** ボタン内部に残高をインライン表示する（デフォルト: false） */
  showBalanceInline?: boolean;
}

/**
 * トークン選択ダイアログのプロパティ
 */
interface TokenSelectDialogProps {
  /** ダイアログが開いているかどうか */
  open: boolean;
  /** ダイアログの開閉状態変更コールバック */
  onOpenChange: (open: boolean) => void;
  /** トークン選択時のコールバック */
  onTokenSelect: (token: Token) => void;
  /** 除外するトークン */
  excludeToken?: Token;
  /** 選択されたトークン */
  selectedToken?: Token;
}

/**
 * トークンリストアイテムのプロパティ
 */
interface TokenListItemProps {
  /** トークン情報 */
  token: Token;
  /** クリック時のコールバック */
  onClick: () => void;
  /** 選択されているかどうか */
  isSelected?: boolean;
  /** 無効状態かどうか */
  disabled?: boolean;
}

/**
 * トークンリストアイテムコンポーネント
 */
function TokenListItem({ token, onClick, isSelected, disabled }: TokenListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full flex items-center gap-3 p-3 rounded-lg transition-colors
        hover:bg-accent hover:text-accent-foreground
        disabled:opacity-50 disabled:cursor-not-allowed
        ${isSelected ? "bg-accent text-accent-foreground" : ""}
      `}
    >
      {/* トークンロゴ */}
      <div className="relative w-8 h-8 flex-shrink-0">
        {token.logoURI ? (
          <Image
            src={token.logoURI}
            alt={`${token.symbol} logo`}
            width={32}
            height={32}
            className="rounded-full"
            onError={(e) => {
              // ロゴ読み込みエラー時のフォールバック
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
            }}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
            {token.symbol.slice(0, 2)}
          </div>
        )}
      </div>

      {/* トークン情報 */}
      <div className="flex-1 text-left">
        <div className="font-medium">{token.symbol}</div>
        <div className="text-sm text-muted-foreground">{token.name}</div>
      </div>

      {/* 選択インジケーター */}
      {isSelected && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
    </button>
  );
}

/**
 * トークン選択ダイアログコンポーネント
 */
function TokenSelectDialog({
  open,
  onOpenChange,
  onTokenSelect,
  excludeToken,
  selectedToken,
}: TokenSelectDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const allTokens = getAllTokens();

  // 検索フィルタリング
  const filteredTokens = allTokens.filter((token) => {
    // 除外トークンをフィルタリング
    if (excludeToken && token.address.toLowerCase() === excludeToken.address.toLowerCase()) {
      return false;
    }

    // 検索クエリでフィルタリング
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const handleTokenSelect = (token: Token) => {
    onTokenSelect(token);
    onOpenChange(false);
    setSearchQuery(""); // 検索クエリをリセット
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>トークンを選択</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 検索入力 */}
          <Input
            placeholder="トークン名、シンボル、またはアドレスで検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />

          {/* トークンリスト */}
          <div className="max-h-80 overflow-y-auto space-y-1">
            {filteredTokens.length > 0 ? (
              filteredTokens.map((token) => (
                <TokenListItem
                  key={token.address}
                  token={token}
                  onClick={() => handleTokenSelect(token)}
                  isSelected={selectedToken?.address.toLowerCase() === token.address.toLowerCase()}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery
                  ? "該当するトークンが見つかりません"
                  : "利用可能なトークンがありません"}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * トークン選択コンポーネント
 *
 * トークンの選択、残高表示、エラー表示などの機能を提供します。
 */
export function TokenSelector({
  selectedToken,
  onTokenSelect,
  excludeToken,
  balance,
  isLoadingBalance = false,
  disabled = false,
  placeholder = "トークンを選択",
  label,
  error,
  warning,
  showBalanceInline = false,
}: TokenSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenDialog = () => {
    if (!disabled) {
      setIsDialogOpen(true);
    }
  };

  return (
    <div className="space-y-2">
      {/* ラベル */}
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}

      {/* トークン選択ボタン */}
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          onClick={handleOpenDialog}
          disabled={disabled}
          className={`
            w-full h-auto p-3 justify-between
            ${error ? "border-destructive" : ""}
            ${warning ? "border-yellow-500" : ""}
          `}
        >
          <div className="flex items-center gap-3 min-w-0">
            {selectedToken ? (
              <>
                {/* 選択されたトークンのロゴ */}
                <div className="relative w-6 h-6 flex-shrink-0">
                  {selectedToken.logoURI ? (
                    <Image
                      src={selectedToken.logoURI}
                      alt={`${selectedToken.symbol} logo`}
                      width={24}
                      height={24}
                      className="rounded-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {selectedToken.symbol.slice(0, 2)}
                    </div>
                  )}
                </div>

                {/* トークン情報 */}
                <div className="text-left min-w-0">
                  <div className="font-medium truncate">{selectedToken.symbol}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[12rem]">{selectedToken.name}</div>
                </div>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>

          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
        {/* 残高（任意でボタン内インライン表示） */}
        {showBalanceInline && selectedToken && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {isLoadingBalance ? (
              <span className="animate-pulse">読み込み中...</span>
            ) : balance !== undefined ? (
              <span>
                残高:{" "}
                {formatTokenAmount(balance, selectedToken.decimals, {
                  maximumFractionDigits: 6,
                  showSymbol: true,
                  symbol: selectedToken.symbol,
                })}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* エラーメッセージ */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* 警告メッセージ */}
      {warning && <p className="text-sm text-yellow-600">{warning}</p>}

      {/* トークン選択ダイアログ */}
      <TokenSelectDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onTokenSelect={onTokenSelect}
        excludeToken={excludeToken}
        selectedToken={selectedToken}
      />
    </div>
  );
}
