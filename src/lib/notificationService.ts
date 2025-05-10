import {
  getOutstandingTransactions,
  shouldSendMonthlyReminder,
  generateMonthlyReminderMessage,
} from "@/lib/offChainSpendingService";

// Check local storage for last notification timestamp
const NOTIFICATION_KEY = "gnosis_payment_notifications";

interface NotificationRecord {
  userAddress: string;
  lastNotified: number;
  // Store notification type to avoid duplicate reminders
  notificationType: "monthly" | "weekly" | "upcoming";
}

// Get user notification status
export const getNotificationStatus = (
  userAddress: string
): NotificationRecord | null => {
  try {
    const notificationsJSON = localStorage.getItem(NOTIFICATION_KEY);
    if (!notificationsJSON) return null;

    const notifications: NotificationRecord[] = JSON.parse(notificationsJSON);
    return (
      notifications.find(
        (n) => n.userAddress.toLowerCase() === userAddress.toLowerCase()
      ) || null
    );
  } catch (error) {
    console.error("Error getting notification status:", error);
    return null;
  }
};

// Update notification status
export const updateNotificationStatus = (
  userAddress: string,
  notificationType: "monthly" | "weekly" | "upcoming"
): void => {
  try {
    const notificationsJSON = localStorage.getItem(NOTIFICATION_KEY);
    let notifications: NotificationRecord[] = [];

    if (notificationsJSON) {
      notifications = JSON.parse(notificationsJSON);
    }

    // Find existing record
    const existingIndex = notifications.findIndex(
      (n) => n.userAddress.toLowerCase() === userAddress.toLowerCase()
    );

    const updatedRecord: NotificationRecord = {
      userAddress,
      lastNotified: Date.now(),
      notificationType,
    };

    if (existingIndex >= 0) {
      notifications[existingIndex] = updatedRecord;
    } else {
      notifications.push(updatedRecord);
    }

    localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error("Error updating notification status:", error);
  }
};

// Check if user should be notified based on time passed
const shouldNotifyAgain = (
  lastNotified: number,
  type: "monthly" | "weekly" | "upcoming"
): boolean => {
  const now = Date.now();
  const timeSinceLastNotification = now - lastNotified;

  // Time thresholds for different notification types
  const timeThresholds = {
    monthly: 30 * 24 * 60 * 60 * 1000, // 30 days
    weekly: 7 * 24 * 60 * 60 * 1000, // 7 days
    upcoming: 1 * 24 * 60 * 60 * 1000, // 1 day
  };

  return timeSinceLastNotification >= timeThresholds[type];
};

// Check if user should receive a notification
export const checkNotificationEligibility = (
  userAddress: string
): {
  shouldNotify: boolean;
  message: string;
  type: "monthly" | "weekly" | "upcoming";
} => {
  // First check if user has outstanding transactions
  if (!shouldSendMonthlyReminder(userAddress)) {
    return { shouldNotify: false, message: "", type: "monthly" };
  }

  // Get user's notification status
  const notificationStatus = getNotificationStatus(userAddress);

  // Determine notification type and message
  const outstandingTransactions = getOutstandingTransactions(userAddress);
  const oldestTransactionTime = Math.min(
    ...outstandingTransactions.map((tx) => tx.timestamp)
  );
  const daysSinceOldestTransaction =
    (Date.now() - oldestTransactionTime) / (1000 * 60 * 60 * 24);

  let notificationType: "monthly" | "weekly" | "upcoming";

  if (daysSinceOldestTransaction >= 25) {
    notificationType = "monthly";
  } else if (daysSinceOldestTransaction >= 20) {
    notificationType = "upcoming";
  } else {
    notificationType = "weekly";
  }

  // Check if enough time has passed since last notification
  if (notificationStatus) {
    // If notification type is the same and not enough time has passed, don't notify
    if (
      notificationStatus.notificationType === notificationType &&
      !shouldNotifyAgain(notificationStatus.lastNotified, notificationType)
    ) {
      return { shouldNotify: false, message: "", type: notificationType };
    }
  }

  // Generate appropriate message
  const message = generateNotificationMessage(userAddress, notificationType);

  return { shouldNotify: true, message, type: notificationType };
};

// Generate notification message based on type
export const generateNotificationMessage = (
  userAddress: string,
  type: "monthly" | "weekly" | "upcoming"
): string => {
  const outstandingTransactions = getOutstandingTransactions(userAddress);
  const totalAmount = outstandingTransactions.reduce(
    (sum, tx) => sum + Number(tx.amount),
    0
  );
  const currency = outstandingTransactions[0]?.currency || "USDC";

  switch (type) {
    case "monthly":
      return `Your monthly payment of ${totalAmount.toFixed(
        2
      )} ${currency} is due. Please clear your balance to earn rewards.`;

    case "upcoming":
      return `Your monthly payment of ${totalAmount.toFixed(
        2
      )} ${currency} will be due soon. Please prepare to clear your balance.`;

    case "weekly":
      return `You have outstanding payments totaling ${totalAmount.toFixed(
        2
      )} ${currency} that will need to be cleared by the end of the month.`;

    default:
      return generateMonthlyReminderMessage(userAddress);
  }
};
