import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEFAULT_CHANNEL, isChannelCode } from '@/lib/channel';

export const CHANNEL_COOKIE = 'lopho-channel';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, firstSegment] = pathname.split('/');

  // Asset/API/internal paths never carry a channel prefix.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname === '/') {
    const preferred = request.cookies.get(CHANNEL_COOKIE)?.value;
    const channel = preferred && isChannelCode(preferred) ? preferred : DEFAULT_CHANNEL;
    const url = request.nextUrl.clone();
    url.pathname = `/${channel}`;
    return NextResponse.redirect(url);
  }

  if (!firstSegment || !isChannelCode(firstSegment)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set(CHANNEL_COOKIE, firstSegment, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
