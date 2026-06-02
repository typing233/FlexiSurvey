import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/admin/surveys" className="text-xl font-bold text-indigo-600">
            FlexiSurvey
          </Link>
          <nav className="flex gap-4">
            <Link href="/admin/surveys" className="text-gray-600 hover:text-gray-900">
              问卷管理
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
