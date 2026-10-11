import type { Config, Context } from '@netlify/edge-functions'

async function credentialsMatch(supplied: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const [suppliedDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(supplied)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ])
  const suppliedBytes = new Uint8Array(suppliedDigest)
  const expectedBytes = new Uint8Array(expectedDigest)
  let difference = 0

  for (let index = 0; index < suppliedBytes.length; index += 1) {
    difference |= suppliedBytes[index] ^ expectedBytes[index]
  }

  return difference === 0
}

function privateResponse(body: string, status: number, challenge = false): Response {
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'Netlify-CDN-Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    Vary: 'Authorization',
  })

  if (challenge) {
    headers.set('WWW-Authenticate', 'Basic realm="SDS Front Desk", charset="UTF-8"')
  }

  return new Response(body, { status, headers })
}

export default async (request: Request, context: Context): Promise<Response> => {
  const url = new URL(request.url)

  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    url.protocol = 'https:'
    return new Response(null, { status: 308, headers: { Location: url.href, 'Cache-Control': 'no-store' } })
  }

  const username = Netlify.env.get('SITE_AUTH_USERNAME')
  const password = Netlify.env.get('SITE_AUTH_PASSWORD')

  if (!username || !password || username.includes(':')) {
    return privateResponse('Site access is not configured. Please contact the site administrator.', 503)
  }

  const authorization = request.headers.get('Authorization')
  const match = authorization?.match(/^Basic ([A-Za-z0-9+/]+={0,2})$/i)

  if (!match || match[1].length > 8192) {
    return privateResponse('Please sign in to access the SDS Front Desk Resource Hub.', 401, true)
  }

  let supplied: string

  try {
    const decoded = Uint8Array.from(atob(match[1]), character => character.charCodeAt(0))
    supplied = new TextDecoder('utf-8', { fatal: true }).decode(decoded)
  } catch {
    return privateResponse('Invalid username or password.', 401, true)
  }

  if (!(await credentialsMatch(supplied, `${username}:${password}`))) {
    return privateResponse('Invalid username or password.', 401, true)
  }

  const response = await context.next()
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('Netlify-CDN-Cache-Control', 'no-store')
  response.headers.append('Vary', 'Authorization')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  return response
}

export const config: Config = {
  path: '/*',
  onError: 'fail',
}
