import { WalletContainer } from "@/components/WalletContainer";
import { DepositPortal } from "@/components/DepositPortal";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center w-full max-w-xl">
        <div className="flex flex-col items-center gap-6 w-full">
          <h1 className="text-3xl font-bold">Flux Web3 App</h1>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-2">
            A Next.js app with RainbowKit, Wagmi, and Gnosis Pay simulation
          </p>
          <WalletContainer />
        </div>

        <DepositPortal />

        <div className="flex gap-4 items-center flex-col sm:flex-row mt-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-lg">
            This demo shows a personal wallet connection plus a simulated Gnosis
            Pay wallet integration. The Safe wallet addresses are for
            demonstration only.
          </p>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row mt-4">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="https://docs.rainbowkit.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            RainbowKit Docs
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto"
            href="https://app.safe.global/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Safe Wallet
          </a>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn"
          target="_blank"
          rel="noopener noreferrer"
        >
          Next.js Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://safe.global/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Safe Global
        </a>
      </footer>
    </div>
  );
}
