'use client'

import { BookOpen, Gem, Layers, Scissors, ShirtIcon, ShoppingBag, Sparkles } from 'lucide-react'
import { WorkspaceLauncher, type WorkspaceApp } from '@/components/workspaces/WorkspaceLauncher'

const apps: WorkspaceApp[] = [
  { title: 'Style', description: 'Daily outfit inspiration and your personal style pull.', href: '/creative?tab=oracle', icon: Sparkles, art: 'fashion' },
  { title: 'Oracle', description: 'Ask your AI stylist what to wear, pair, or change.', href: '/creative?tab=oracle', icon: BookOpen, art: 'oracle' },
  { title: 'Closet', description: 'Browse and organize everything in your wardrobe.', href: '/creative?tab=closet', icon: ShirtIcon, art: 'closet' },
  { title: 'Sewing', description: 'Track sewing projects, materials, stages, and ideas.', href: '/creative?tab=projects', icon: Scissors, art: 'sewing' },
  { title: 'Generated', description: 'Open your AI-created looks, concepts, and renders.', href: '/creative?tab=studio', icon: Layers, art: 'generated' },
  { title: 'Vault', description: 'Keep saved fashion concepts and favorite creative ideas.', href: '/creative?tab=vault', icon: Gem, art: 'vault' },
  { title: 'Wishlist', description: 'Save pieces you want and keep shopping organized.', href: '/creative?tab=shopping', icon: ShoppingBag, art: 'wishlist' },
]

export default function CreativeHomePage() {
  return <WorkspaceLauncher eyebrow="Luna Creative" title="Creative" description="Your personal fashion studio. Swipe through your apps and open only the space you want to use." apps={apps} theme="creative" />
}
