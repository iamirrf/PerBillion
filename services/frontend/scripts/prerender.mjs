import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const origin = 'https://perbillion-705825363504.us-central1.run.app'
const pages = {
  learn: {
    title: 'Investing Academy · PerBillion',
    description: 'Explore 24 focused investing lessons and three complete free previews.',
    heading: 'Build judgment, one decision at a time.',
    copy: 'Follow four learning paths from investing foundations through quantitative research.',
  },
  practice: {
    title: 'Practice investing decisions · PerBillion',
    description: 'Test investing ideas with fictional assets, virtual cash, and repeatable scenarios.',
    heading: 'Make the decision. See the consequence.',
    copy: 'Practice allocation and trading decisions without real money, then review the result.',
  },
  research: {
    title: 'Transparent forecast research · PerBillion',
    description: 'Explore weekly statistical forecasts, uncertainty, validation, and source provenance.',
    heading: 'The future is a range, not a line.',
    copy: 'Use statistical research to learn how model assumptions and uncertainty shape a result.',
  },
  pricing: {
    title: 'Academy membership · PerBillion',
    description: 'Explore PerBillion Academy membership: 24 lessons, simulated practice, and 12 weekly missions after a seven-day trial.',
    heading: 'Learn the idea. Practice the decision.',
    copy: 'Preview three complete lessons, then continue with the full academy for $29 per month after a card-required seven-day trial.',
  },
  'learn/money-to-investing': {
    title: 'Your money, with a future · PerBillion', description: 'A free lesson about saving, investing, trading, goals, and time horizons.', heading: 'Your money, with a future.', copy: 'Separate financial goals by purpose, timing, and capacity for uncertainty.',
  },
  'learn/compound-interest': {
    title: 'The quiet power of compounding · PerBillion', description: 'A free interactive lesson about time, returns, fees, and inflation.', heading: 'The quiet power of compounding.', copy: 'Explore how time changes growth while keeping assumptions visible.',
  },
  'learn/diversification': {
    title: 'Diversification · PerBillion', description: 'A free interactive lesson about concentration and shared portfolio risks.', heading: 'One portfolio. Many possibilities.', copy: 'See how holdings can look different while sharing the same underlying risks.',
  },
  about: {
    title: 'About PerBillion · Learn, practice, research',
    description: 'Why PerBillion connects investing lessons, fictional market practice, and transparent statistical research.',
    heading: 'Understanding becomes confidence.',
    copy: 'PerBillion helps curious investors build knowledge, test decisions with virtual money, and inspect model uncertainty.',
  },
  privacy: {
    title: 'Privacy · PerBillion',
    description: 'How PerBillion handles account, learning, practice, and research data.',
    heading: 'Privacy, in plain language.',
    copy: 'Learn what PerBillion stores, why it is needed, and how to export or reset your account data.',
  },
  terms: {
    title: 'Terms · PerBillion',
    description: 'Terms for using PerBillion educational tools, fictional simulations, and statistical forecasts.',
    heading: 'Terms built for clarity.',
    copy: 'PerBillion is an educational platform. Simulations and forecasts are not investment advice or real-money orders.',
  },
}

const dist = resolve('dist')
const shell = await readFile(resolve(dist, 'index.html'), 'utf8')
for (const [route, page] of Object.entries(pages)) {
  const canonical = `${origin}/${route}`
  const fallback = `<main style="max-width:1000px;margin:15vh auto;padding:24px;font-family:Arial,sans-serif"><p>PERBILLION</p><h1 style="font-size:64px;line-height:1">${page.heading}</h1><p style="font-size:20px;max-width:640px">${page.copy}</p></main>`
  const html = shell
    .replace(/<title>.*?<\/title>/, `<title>${page.title}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${page.description}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${page.title}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${page.description}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${page.title}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${page.description}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<div id="root">[\s\S]*?<\/div>\s*<noscript>/, `<div id="root">${fallback}</div>\n    <noscript>`)
  const directory = resolve(dist, route)
  await mkdir(directory, { recursive: true })
  await writeFile(resolve(directory, 'index.html'), html)
}
