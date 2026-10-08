'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export function DarkModeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (resolvedTheme) setIsDark(resolvedTheme === 'dark');
  }, [resolvedTheme]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {mounted && isDark ? (
        <Sun className="h-[18px] w-[18px] text-foreground" />
      ) : (
        <Moon className="h-[18px] w-[18px] stroke-[1.5] text-foreground" />
      )}
      <Switch
        aria-label="Dark mode"
        checked={isDark}
        onCheckedChange={(on) => {
          setIsDark(on);
          setTheme(on ? 'dark' : 'light');
        }}
        disabled={!mounted}
      />
    </div>
  );
}
