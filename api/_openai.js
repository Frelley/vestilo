export const OPENAI_SMALL_MODEL = process.env.OPENAI_SMALL_MODEL || 'gpt-5.4-nano'

function extractResponseText(data) {
  if (typeof data?.output_text === 'string') return data.output_text

  return (data?.output || [])
    .flatMap(item => item?.content || [])
    .map(part => part?.text || part?.output_text || part?.refusal || '')
    .filter(Boolean)
    .join('\n')
}

export async function createSmallResponse({ input, maxOutputTokens = 256 }) {
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    const err = new Error('Missing OPENAI_API_KEY')
    err.status = 500
    throw err
  }

  const openaiRes = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_SMALL_MODEL,
      input,
      max_output_tokens: maxOutputTokens,
    }),
  })

  const data = await openaiRes.json().catch(() => null)
  if (!openaiRes.ok) {
    const err = new Error(data?.error?.message || 'OpenAI API error')
    err.status = openaiRes.status
    err.details = data
    throw err
  }

  return extractResponseText(data)
}
