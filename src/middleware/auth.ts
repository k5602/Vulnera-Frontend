/**
 * Authentication Middleware
 * Protects pages that require authentication
 */

// export function defineMiddleware(context: any, next: any) {
//   // Pages that don't require authentication
//   const publicPages = [
//     '/',
//     '/login',
//     '/signup',
//     '/about',
//     '/docs'
//   ];

//   const pathname = context.url.pathname;
  
//   // Check if current page requires authentication
//   const isPublicPage = publicPages.includes(pathname);
  
//   if (!isPublicPage) {
//     // Check for auth token
//     const token = context.cookies.get('auth_token')?.value;
    
//     if (!token) {
//       // Redirect to login with return URL
//       return context.redirect(`/login?next=${encodeURIComponent(pathname)}`);
//     }
//   }
  
//   return next();
// }
