import { auth } from '@/lib/auth';
import { Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function Header() {
  const user = auth.getCurrentUser();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          访客管理系统
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <Badge className="absolute top-1 right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
            3
          </Badge>
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
        {user && (
          <div className="flex items-center gap-3 ml-2 pl-3 border-l">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-semibold shadow-lg">
              {user.name?.[0] || user.username[0].toUpperCase()}
            </div>
            <div className="hidden md:block">
              <div className="text-sm font-semibold">{user.name || user.username}</div>
              <div className="text-xs text-muted-foreground">管理员</div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
