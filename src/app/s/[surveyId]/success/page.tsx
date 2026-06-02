import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center bg-white rounded-xl shadow-sm border border-gray-200 p-12 max-w-md">
        <div className="text-5xl mb-4">&#10003;</div>
        <h1 className="text-2xl font-bold mb-2">提交成功</h1>
        <p className="text-gray-600 mb-6">感谢您的参与！您的回答已成功提交。</p>
        <Link
          href="/"
          className="text-indigo-600 hover:underline"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
