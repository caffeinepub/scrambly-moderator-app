import React from 'react';
import { Link } from '@tanstack/react-router';
import { ShieldOff, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AccessDenied() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-destructive/20 flex items-center justify-center mx-auto mb-6">
        <ShieldOff className="w-8 h-8 text-destructive" />
      </div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-3">Access Denied</h1>
      <p className="text-muted-foreground mb-6">
        You don't have permission to access this page. This area is restricted to authorized personnel only.
      </p>
      <Button asChild variant="outline" className="gap-2">
        <Link to="/">
          <Home className="w-4 h-4" />
          Go Home
        </Link>
      </Button>
    </div>
  );
}
