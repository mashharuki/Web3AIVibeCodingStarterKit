'use client';

import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/useWallet';
import { truncateAddress } from '@/lib/web3';

export function WalletButton() {
  const { authenticated, address, isConnecting, connectWallet, disconnectWallet } = useWallet();

  if (authenticated && address) {
    return (
      <Button
        variant="outline"
        onClick={disconnectWallet}
        className="min-w-[140px]"
      >
        {truncateAddress(address)}
      </Button>
    );
  }

  return (
    <Button
      onClick={connectWallet}
      disabled={isConnecting}
      className="min-w-[140px]"
    >
      {isConnecting ? 'ウォレット接続中...' : 'ウォレット接続'}
    </Button>
  );
}
