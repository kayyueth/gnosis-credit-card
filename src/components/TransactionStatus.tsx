"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export type TransactionStatus =
  | "idle"
  | "loading"
  | "borrowing"
  | "success"
  | "error";

interface TransactionStatusProps {
  status: TransactionStatus;
  message?: string;
  className?: string;
}

export function TransactionStatus({
  status,
  message,
  className,
}: TransactionStatusProps) {
  const getStatusIcon = (): ReactNode => {
    switch (status) {
      case "loading":
      case "borrowing":
        return <Loader2 className="h-5 w-5 animate-spin" />;
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (): string => {
    switch (status) {
      case "loading":
        return "Processing transaction...";
      case "borrowing":
        return "Borrowing funds...";
      case "success":
        return "Transaction successful!";
      case "error":
        return "Transaction failed";
      default:
        return "";
    }
  };

  if (status === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg p-3 text-sm",
        (status === "loading" || status === "borrowing") &&
          "bg-blue-50 dark:bg-blue-900/20",
        status === "success" && "bg-green-50 dark:bg-green-900/20",
        status === "error" && "bg-red-50 dark:bg-red-900/20",
        className
      )}
    >
      {getStatusIcon()}
      <span>{message || getStatusText()}</span>
    </div>
  );
}
