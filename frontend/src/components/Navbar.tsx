"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Clapperboard, LogOut, Settings as SettingsIcon, Film } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
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

  const navLinks = [
    { href: "/projects", label: "项目列表" },
    { href: "/settings", label: "设置" },
  ];

  return (
    <nav className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            href={token && mounted ? "/projects" : "/"}
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            <Film className="h-5 w-5 text-primary" />
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              ScriptLens
            </span>
          </Link>
          {token && mounted && (
            <div className="hidden sm:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname?.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {token && mounted ? (
            <>
              <span className="hidden sm:block text-sm text-muted-foreground">
                {user?.name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
              >
                <LogOut className="h-3 w-3" />
                退出
              </button>
            </>
          ) : (
            !mounted && (
              <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
            )
          )}
          {!token && mounted && (
            <Link
              href="/login"
              className="btn-primary text-xs px-4 py-1.5"
            >
              登录
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
