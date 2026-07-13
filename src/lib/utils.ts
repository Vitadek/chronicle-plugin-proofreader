import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind-aware class merge. Resolved from Chronicle's node_modules and
 *  bundled into the plugin (see PLUGINS.md: the app's deps are the standard
 *  library available to plugins). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
