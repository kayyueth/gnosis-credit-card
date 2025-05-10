"use client";

import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
  trendUp?: boolean;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  trendUp,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </h3>
          <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-1">
            {icon}
          </div>
        </div>
        <div className="text-2xl font-semibold">{value}</div>
        <div
          className={`text-xs mt-1 ${
            trendUp !== undefined
              ? trendUp
                ? "text-green-500"
                : "text-red-500"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {trend}
        </div>
      </CardContent>
    </Card>
  );
}
