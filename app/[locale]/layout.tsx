import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import Sidebar from '@/components/sidebar'
import { RadixThemeProvider } from '@/components/radix-theme-provider'
import { CommandBar } from '@/components/command-bar'

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!(routing.locales as readonly string[]).includes(locale)) notFound()
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      <RadixThemeProvider>
        <Sidebar />
        <main className="ml-[220px] min-h-screen p-8 bg-white">{children}</main>
        <CommandBar />
      </RadixThemeProvider>
    </NextIntlClientProvider>
  )
}
