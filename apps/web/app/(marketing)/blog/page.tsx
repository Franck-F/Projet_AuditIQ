import { redirect } from 'next/navigation';

// /blog → canonical hub is /ressources per maquette (Site Vitrine + footer links).
// Article details remain at /blog/<slug>.
export default function BlogIndexRedirect() {
  redirect('/ressources');
}
