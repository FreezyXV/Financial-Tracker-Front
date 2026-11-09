import { Router } from '@angular/router';

/** Navigue vers une route pouvant contenir une query string (« /transactions?category_id=none »). */
export function navigateTo(router: Router, route: string): void {
  const [path, query] = route.split('?');
  router.navigate([path], { queryParams: Object.fromEntries(new URLSearchParams(query ?? '')) });
}
