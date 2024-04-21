import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BlueX',
  description:
    "Discover the exponential growth with BlueX, a dynamic company swiftly climbing the ranks as one of the world's fastest-growing enterprises. Offering a diverse range of services including IT support, YouTube SEO optimization, web design, development, and e-commerce solutions, BlueX is your one-stop destination for unparalleled innovation and reliability. Join the journey of success with BlueX today!",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body className={inter.className}>{children}</body>
      
    </html>
  )
}
