"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard } from "lucide-react";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Credit Card",
      href: "/",
      icon: <CreditCard className="w-4 h-4 mr-1" />,
    },
  ];

  return (
    <nav className="flex items-center justify-center w-full bg-white dark:bg-gray-800 py-4 px-8 border-b border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-8">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 transition-colors duration-150 flex items-center ${
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-medium"
                  : "text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-300"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
