"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function Navbar() {
  const router = useRouter();
  const { token, user, logout, loadUser } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (token && !user) {
      loadUser();
    }
  }, [token, user, loadUser]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href={token && mounted ? "/projects" : "/"} className="text-lg font-bold">
            ScriptLens
          </Link>
          {token && mounted && (
            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/projects"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                项目列表
              </Link>
              <Link
                href="/settings"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                设置
              </Link>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {token && mounted ? (
            <>
              <span className="text-sm text-muted-foreground">
                {user?.name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-md bg-destructive px-3 py-1.5 text-xs text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                退出登录
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              登录
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
