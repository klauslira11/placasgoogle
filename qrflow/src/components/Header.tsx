import Link from "next/link";
import { APP_NAME } from "@/config/app";
import { auth, signOut } from "@/auth";

export async function Header() {
  const session = await auth();
  const logged = !!session?.user;
  const role = (session?.user as any)?.role;
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-zinc-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="w-8 h-8 rounded-lg bg-zinc-900 text-white grid place-items-center text-sm">QR</span>
          {APP_NAME}
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {logged ? (
            <>
              <Link href="/dashboard" className="hover:text-zinc-900">Dashboard</Link>
              {role === "ADMIN" && <Link href="/admin" className="text-amber-600 font-medium">Admin</Link>}
              <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
                <button className="px-4 py-2 rounded-full border">Sair</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="px-4 py-2 rounded-full border">Entrar</Link>
              <Link href="/register" className="px-4 py-2 rounded-full bg-zinc-900 text-white">Criar conta</Link>
            </>
          )}
        </nav>
        <div className="md:hidden flex items-center gap-2">
          {logged ? <Link href="/dashboard" className="px-3 py-1 text-sm border rounded">Dashboard</Link> : <Link href="/login" className="px-3 py-1 text-sm border rounded">Entrar</Link>}
        </div>
      </div>
    </header>
  );
}
