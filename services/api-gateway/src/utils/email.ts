import logger from './logger';

export async function sendAccountEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    logger.warn(`Transactional email skipped because RESEND_API_KEY or EMAIL_FROM is not configured (${subject})`);
    return false;
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!response.ok) throw new Error(`Resend returned ${response.status}`);
  return true;
}
