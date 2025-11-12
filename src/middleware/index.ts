import { defineMiddleware } from 'astro:middleware';

const PUBLIC_PAGES = [
  '/',
  '/login',
  '/signup',
  '/about',
];

export const onRequest = defineMiddleware((context, next) => {
  const pathname = context.url.pathname;

  // Check if route is public
  const isPublicPage = PUBLIC_PAGES.some(
    (page) => pathname === page || pathname.startsWith(page + '/')
  );

  if (!isPublicPage) {
    // Protected route - verify authentication
    const token = context.cookies.get('auth_token');

    if (!token?.value) {
      // No token found - redirect to login
      return context.redirect(
        `/login?next=${encodeURIComponent(pathname)}`
      );
    }

    // TODO: Add server-side token validation against backend
  }

  return next();
});
