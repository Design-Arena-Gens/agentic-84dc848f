import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LED Generator Agent',
  description: 'AI-powered LED pattern and animation generator',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
