import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const origin = 'https://perbillion-705825363504.us-central1.run.app'
const pages = {
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
