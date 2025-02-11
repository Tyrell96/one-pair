"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, History, Wallet, User, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const menus = [
    {
      icon: Home,
      label: "홈",
      href: "/",
    },
    {
      icon: History,
      label: "내역",
      href: "/transactions",
    },
    {
      icon: Wallet,
      label: "포인트",
      href: "/points",
    },
    {
      icon: User,
      label: "프로필",
      href: "/profile",
    },
    {
      icon: Bell,
      label: "공지사항",
      href: "/notices",
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t h-16">
      <nav className="h-full max-w-lg mx-auto flex items-center justify-around">
        {menus.map((menu) => {
          const isActive = pathname === menu.href;
          const Icon = menu.icon;
          
          return (
            <button
              key={menu.href}
              onClick={() => router.push(menu.href)}
              className="flex flex-col items-center justify-center w-full h-full"
            >
              <Icon
                className={cn(
                  "h-5 w-5 mb-1",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "text-xs",
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
                )}
              >
                {menu.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
} 