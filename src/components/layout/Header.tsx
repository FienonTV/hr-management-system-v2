'use client';

import { useSession } from 'next-auth/react';

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center space-x-4">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
      </div>

      <div className="flex items-center space-x-4">
        {/* User Info */}
        <div className="flex items-center space-x-3 rounded-lg border border-gray-300 px-4 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white">
            <span className="text-sm font-medium">
              {session?.user?.name?.charAt(0).toUpperCase() ||
                session?.user?.email?.charAt(0).toUpperCase() ||
                '?'}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{session?.user?.name || session?.user?.email}</p>
            {session?.user?.name && session?.user?.email && session.user.name !== session.user.email && (
              <p className="text-xs text-gray-500">{session.user.email}</p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
