"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const publicRoutes = ['/sign-in', '/sign-up'];

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const isPublicRoute = publicRoutes.includes(pathname || '');

    if (!token && !isPublicRoute) {
      router.push("/sign-in");
    } else if (token && isPublicRoute) {
      router.push("/");
    }
  }, [pathname, router]);

  return <>{children}</>;
} 