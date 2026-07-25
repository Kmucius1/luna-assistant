export interface TodayDockLink {
  label: string
  href: string
}

export interface TodayDockCategory {
  id: string
  label: string
  links: TodayDockLink[]
}

export const TODAY_DOCK_CATEGORIES: TodayDockCategory[] = [
  {
    id: 'morning',
    label: 'Morning Plan',
    links: [
      { label: 'View Full Plan', href: '/plan-my-day' },
    ],
  },
  {
    id: 'gym',
    label: 'Gym',
    links: [
      { label: 'Goals', href: '/fitness?tab=goals' },
      { label: 'Gym', href: '/fitness?tab=gym' },
      { label: 'Equipment', href: '/fitness?tab=equipment' },
      { label: 'Schedule', href: '/fitness?tab=schedule' },
    ],
  },
  {
    id: 'meals',
    label: 'Meals',
    links: [
      { label: 'Meal Plan', href: '/food?tab=meal_plan' },
      { label: 'Recipes', href: '/food?tab=recipes' },
      { label: 'Groceries', href: '/food?tab=groceries' },
      { label: 'Pantry', href: '/food?tab=pantry' },
      { label: 'Favorites', href: '/food?tab=favorites' },
    ],
  },
  {
    id: 'outfit',
    label: "Today's Outfit",
    links: [
      { label: 'AI Closet', href: '/style#closet' },
      { label: 'Inspiration', href: '/style#inspiration' },
      { label: 'Saved Looks', href: '/style#saved' },
    ],
  },
  {
    id: 'work',
    label: 'Work',
    links: [
      { label: 'Tasks', href: '/work#tasks' },
      { label: 'Agenda', href: '/work#agenda' },
      { label: 'Projects', href: '/work#projects' },
      { label: 'Notes', href: '/work#notes' },
    ],
  },
  {
    id: 'wellness',
    label: 'For You Today',
    links: [
      { label: 'Reset', href: '/wellness#reset' },
      { label: 'Mood', href: '/wellness#mood' },
      { label: 'Hydration', href: '/wellness#hydration' },
      { label: 'Sleep', href: '/wellness#sleep' },
    ],
  },
  {
    id: 'astrology',
    label: 'Daily Astrology',
    links: [
      { label: 'Today', href: '/astrology' },
      { label: 'My Chart', href: '/astrology/chart' },
      { label: 'Timing', href: '/astrology/timing' },
      { label: 'Connections', href: '/astrology/connections' },
      { label: 'More', href: '/astrology/more' },
    ],
  },
]
