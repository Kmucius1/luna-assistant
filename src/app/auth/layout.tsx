import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LUNA — Your Personal Sanctuary',
  description: 'LUNA. Your personal sanctuary. Enter your sanctuary. Don’t have an account? Sign up.',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
