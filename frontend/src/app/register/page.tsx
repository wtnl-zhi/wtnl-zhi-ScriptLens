"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { Film, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, password, name);
      router.push("/projects");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Film className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">创建账号</h1>
          <p className="mt-1 text-sm text-muted-foreground">注册 ScriptLens</p>
        </div>
        <div className="card-panel p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="section-label">名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="input-field"
                placeholder="您的名称"
              />
            </div>
            <div>
              <label className="section-label">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="section-label">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="input-field"
                placeholder="至少6位字符"
              />
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  注册中...
                </span>
              ) : (
                "注册"
              )}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            已有账号？{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
