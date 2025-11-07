import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware((context, next) => {
  const publicPages = [
    '/',
    '/login',
    '/signup',
    '/about',
    '/docs'
  ];

  const pathname = context.url.pathname;
  
  const isPublicPage = publicPages.includes(pathname);
  
  if (!isPublicPage) {
    const token = context.cookies.get('auth_token');
    
    if (!token) {
      return context.redirect(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }
  
  return next();
});
