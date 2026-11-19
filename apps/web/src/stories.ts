import type { Me, Story } from './types'

export const sampleStories = [
  { slug: 'sara-karimi', name: 'سارا', src: '/design/story-sara-coffee.jpg' },
  { slug: 'mohammad-rezaei', name: 'محمد', src: '/design/story-mohammad.jpg' },
  { slug: 'niloufar', name: 'نیلوفر', src: '/design/story-niloufar.jpg' },
  { slug: 'kasra', name: 'کسری', src: '/design/story-kasra.jpg' },
] as const

export type StoryTile = {
  id: string
  name: string
  src: string
  items: Story[]
  unseen: boolean
}

export function mergeStoryLists(current: Story[], incoming: Story[]): Story[] {
  const map = new Map<number, Story>()
  for (const row of [...current, ...incoming]) {
    if (row.id) map.set(row.id, row)
  }
  return Array.from(map.values()).sort((a, b) => a.id - b.id)
}

function groupsOf(stories: Story[]): Story[][] {
  const map = new Map<number, Story[]>()
  for (const row of stories) {
    const authorId = row.author.id
    if (authorId == null) continue
    const list = map.get(authorId) ?? []
    list.push(row)
    map.set(authorId, list)
  }
  return Array.from(map.values()).map((rows) => rows.sort((a, b) => a.id - b.id))
}

export function buildStoryTiles(stories: Story[], user: Me | null, withSamples = false): StoryTile[] {
  if (!user?.id) return []
  const groups = groupsOf(stories)
  const liveSlugs = new Set(groups.map((rows) => rows[0]?.author.slug).filter(Boolean))

  const others = groups
    .filter((rows) => rows[0]?.author.id !== user.id)
    .map((rows) => {
      const latest = rows[rows.length - 1]
      return {
        id: `live-${latest.author.id ?? latest.id}`,
        name: latest.author.name.split(' ').slice(-1)[0] || latest.author.name,
        src: latest.media_url,
        items: rows,
        unseen: rows.some((row) => !row.seen),
      }
    })
    .sort((a, b) => Number(b.unseen) - Number(a.unseen))

  if (!withSamples || others.length > 0) return others

  const fillers: StoryTile[] = []
  for (const sample of sampleStories) {
    if (liveSlugs.has(sample.slug)) continue
    fillers.push({
      id: `sample-${sample.slug}`,
      name: sample.name,
      src: sample.src,
      items: [],
      unseen: false,
    })
  }

  return fillers
}

export function myStories(stories: Story[], user: Me | null): Story[] {
  if (!user?.id) return []
  return stories.filter((row) => row.author.id === user.id).sort((a, b) => a.id - b.id)
}