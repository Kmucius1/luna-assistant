import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'MMM d')
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM d, h:mm a')
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function isOverdue(date: string | Date): boolean {
  return isPast(new Date(date))
}

export const URGENCY_COLORS: Record<string, string> = {
  low: 'text-slate-500 bg-slate-100',
  medium: 'text-amber-600 bg-amber-50',
  high: 'text-orange-600 bg-orange-50',
  critical: 'text-red-600 bg-red-50',
}

export const URGENCY_DOT: Record<string, string> = {
  low: 'bg-slate-400',
  medium: 'bg-amber-400',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
}

export const STATUS_COLORS: Record<string, string> = {
  todo: 'text-slate-600 bg-slate-100',
  in_progress: 'text-blue-600 bg-blue-50',
  waiting: 'text-amber-600 bg-amber-50',
  done: 'text-green-600 bg-green-50',
  cancelled: 'text-slate-400 bg-slate-50',
}

export const CATEGORY_COLORS: Record<string, string> = {
  'EHM Strategies': 'bg-purple-100 text-purple-700',
  'DRYP Digital': 'bg-cyan-100 text-cyan-700',
  'Ad-Vantage': 'bg-yellow-100 text-yellow-700',
  'Client Websites': 'bg-blue-100 text-blue-700',
  'Social Media': 'bg-pink-100 text-pink-700',
  'School': 'bg-green-100 text-green-700',
  'Personal': 'bg-indigo-100 text-indigo-700',
  'Health': 'bg-red-100 text-red-700',
  'Content Creation': 'bg-orange-100 text-orange-700',
  'Events': 'bg-teal-100 text-teal-700',
  'Follow-ups': 'bg-slate-100 text-slate-700',
  'Money / Invoices': 'bg-emerald-100 text-emerald-700',
  'Urgent Fixes': 'bg-red-100 text-red-700',
  'DRYP Studio': 'bg-violet-100 text-violet-700',
  'Linked Up': 'bg-lime-100 text-lime-700',
  'Modeling': 'bg-rose-100 text-rose-700',
  'Tattooing': 'bg-stone-200 text-stone-700',
  'Painting': 'bg-fuchsia-100 text-fuchsia-700',
  'Fashion': 'bg-amber-100 text-amber-700',
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}
