"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useOffChainSpending } from "@/hooks/useOffChainSpending";
import {
  checkNotificationEligibility,
  updateNotificationStatus,
} from "@/lib/notificationService";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface MonthlyReminderBannerProps {
  className?: string;
}

export function MonthlyReminderBanner({
  className,
}: MonthlyReminderBannerProps) {
  const { address } = useAccount();
  const { checkForReminders, clearMonthlyBalance } = useOffChainSpending();

  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{
    shouldNotify: boolean;
    message: string;
    type: "monthly" | "weekly" | "upcoming";
  }>({ shouldNotify: false, message: "", type: "monthly" });

  // Check for notifications whenever the component mounts or address changes
  useEffect(() => {
    if (address) {
      // First check for reminders
      checkForReminders();

      // Then check for notifications
      const notificationStatus = checkNotificationEligibility(address);
      setNotification(notificationStatus);

      // Mark notification as delivered if showing it
      if (notificationStatus.shouldNotify) {
        updateNotificationStatus(address, notificationStatus.type);
      }
    }
  }, [address, checkForReminders]);

  // Close the banner
  const handleClose = () => {
    setIsVisible(false);
  };

  // Handle payment
  const handlePayNow = async () => {
    if (!address) return;

    setIsLoading(true);
    try {
      await clearMonthlyBalance();
      // Banner will automatically hide if balance is cleared
      setIsVisible(false);
    } catch (error) {
      console.error("Error clearing balance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // If there's no notification or banner is dismissed, don't show anything
  if (!notification.shouldNotify || !notification.message || !isVisible) {
    return null;
  }

  // Get the theme based on notification type
  const getTheme = () => {
    switch (notification.type) {
      case "monthly":
        return {
          bg: "bg-red-50 dark:bg-red-900/30",
          text: "text-red-800 dark:text-red-200",
          border: "border-red-300 dark:border-red-800",
          hover: "hover:bg-red-100 dark:hover:bg-red-900",
        };
      case "upcoming":
        return {
          bg: "bg-amber-50 dark:bg-amber-900/30",
          text: "text-amber-800 dark:text-amber-200",
          border: "border-amber-300 dark:border-amber-800",
          hover: "hover:bg-amber-100 dark:hover:bg-amber-900",
        };
      default:
        return {
          bg: "bg-blue-50 dark:bg-blue-900/30",
          text: "text-blue-800 dark:text-blue-200",
          border: "border-blue-300 dark:border-blue-800",
          hover: "hover:bg-blue-100 dark:hover:bg-blue-900",
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      className={`${theme.bg} ${theme.text} px-4 py-3 rounded-lg flex items-start justify-between shadow-sm ${className}`}
    >
      <div className="flex items-start">
        <Bell className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-medium">
            {notification.type === "monthly"
              ? "Payment Due"
              : notification.type === "upcoming"
              ? "Upcoming Payment"
              : "Payment Reminder"}
          </h3>
          <p className="text-sm mt-1">{notification.message}</p>
        </div>
      </div>
      <div className="flex items-center ml-4 gap-2">
        <Button
          variant="outline"
          size="sm"
          className={`${theme.text} ${theme.border} ${theme.hover}`}
          onClick={handlePayNow}
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Pay Now"}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 p-0 ${theme.text} ${theme.hover}`}
          onClick={handleClose}
          disabled={isLoading}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </div>
  );
}
