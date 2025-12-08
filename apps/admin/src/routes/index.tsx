import { createFileRoute, redirect } from '@tanstack/react-router';
import { auth } from '@/lib/auth';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (!auth.isAuthenticated()) {
      throw redirect({ to: '/login' });
    }
    throw redirect({ to: '/dashboard' });
  },
});

