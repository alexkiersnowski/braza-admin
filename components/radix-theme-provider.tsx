'use client';

import { Theme } from '@radix-ui/themes';

export function RadixThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Theme appearance="light" accentColor="amber" radius="medium">
      {children}
    </Theme>
  );
}
