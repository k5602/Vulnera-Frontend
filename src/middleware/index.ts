import { defineMiddleware } from 'astro:middleware';

const PUBLIC_PAGES = [
  '/',
  '/login',
  '/signup',
  '/docs',
];

export const onRequest = defineMiddleware((context, next) => {
  const pathname = context.url.pathname;

  // Check if route is public
  const isPublicPage = PUBLIC_PAGES.some(
    (page) => pathname === page || pathname.startsWith(page + '/')
  );

  if (!isPublicPage) {
    // Protected route - verify authentication
    // Check for access_token (JWT) or other session cookies
    const cookieHeader = context.request.headers.get('cookie') || '';

    // Simple check if access_token exists in cookies
    const hasToken = cookieHeader.includes('access_token=');

    if (!hasToken) {
      console.log('[Middleware] No access_token found, redirecting to login');
      return context.redirect(
        `/login?next=${encodeURIComponent(pathname)}`
      );
    }
  }

  return next();
});