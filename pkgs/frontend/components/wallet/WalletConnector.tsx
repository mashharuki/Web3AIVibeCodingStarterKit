"use client";

import { Button } from "@/components/ui/button";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LogOut, Wallet } from "lucide-react";
import { useAccount, useDisconnect } from "wagmi";

/**
 * ウォレット接続コンポーネント
 * RainbowKitのConnectButtonをカスタマイズして使用
 */
export function WalletConnector() {
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // マウント前やローディング中の表示
        const ready = mounted && authenticationStatus !== "loading";
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated");

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              // 未接続状態
              if (!connected) {
                return (
                  <Button
                    onClick={openConnectModal}
                    className="flex items-center gap-2"
                    variant="outline"
                  >
                    <Wallet className="h-4 w-4" />
                    ウォレットを接続
                  </Button>
                );
              }

              // 間違ったネットワークに接続している場合
              if (chain.unsupported) {
                return (
                  <Button
                    onClick={openChainModal}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    ⚠️ ネットワークを切り替え
                  </Button>
                );
              }

              // 正常に接続済みの状態
              return (
                <div className="flex items-center gap-2">
                  {/* ネットワーク表示ボタン */}
                  <Button
                    onClick={openChainModal}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          overflow: "hidden",
                          marginRight: 4,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? "Chain icon"}
                            src={chain.iconUrl}
                            style={{ width: 16, height: 16 }}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </Button>

                  {/* アカウント表示ボタン */}
                  <Button
                    onClick={openAccountModal}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Wallet className="h-4 w-4" />
                    {account.displayName}
                    {account.displayBalance ? ` (${account.displayBalance})` : ""}
                  </Button>

                  {/* 切断ボタン */}
                  <Button
                    onClick={() => disconnect()}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
