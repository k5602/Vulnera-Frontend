
declare module '@astrojs/tailwind' {

  import type { Integration } from 'astro';

  const tailwind: (options?: any) => Integration;

  export default tailwind;

}

