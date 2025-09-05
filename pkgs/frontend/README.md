# AMM DEX Frontend

This is the frontend application for the AMM DEX project, built with Next.js and TypeScript.

## Features

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Shadcn/UI** for UI components
- **Web3 Integration** with wagmi, viem, and RainbowKit
- **Responsive Design** with mobile-first approach

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended package manager)

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Copy environment variables:
```bash
cp .env.example .env.local
```

3. Fill in your environment variables in `.env.local`:
   - `NEXT_PUBLIC_ALCHEMY_API_KEY`: Your Alchemy API key for Sepolia network
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Your WalletConnect project ID

### Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build

Build the application for production:

```bash
pnpm build
```

### Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript type checking

## Project Structure

```
├── app/                 # Next.js App Router pages
├── components/          # React components
│   └── ui/             # Shadcn/UI components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
├── utils/              # Utility functions
├── styles/             # Additional styles
└── public/             # Static assets
```

## Technology Stack

| Technology | Version | Description |
|------------|---------|-------------|
| Next.js | 14.2.5 | React framework with App Router |
| React | 18 | UI library |
| TypeScript | 5 | Type-safe JavaScript |
| Tailwind CSS | 3.4.1 | Utility-first CSS framework |
| Shadcn/UI | Latest | Pre-built UI components |
| wagmi | 2.0.0 | React hooks for Ethereum |
| viem | 2.0.0 | TypeScript interface for Ethereum |
| RainbowKit | 2.0.0 | Wallet connection library |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | Alchemy API key for Sepolia | Yes |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID | Yes |
| `NEXT_PUBLIC_AMM_FACTORY_ADDRESS` | Deployed AMM Factory contract address | After deployment |
| `NEXT_PUBLIC_AMM_ROUTER_ADDRESS` | Deployed AMM Router contract address | After deployment |

## Network Configuration

This application is configured to work with:
- **Ethereum Sepolia Testnet** (Chain ID: 11155111)
- **RPC URL**: `https://eth-sepolia.g.alchemy.com/v2/{ALCHEMY_API_KEY}`

## Supported Tokens (Sepolia)

- **USDC**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- **JPYC**: `0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB`
- **PYUSD**: `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9`