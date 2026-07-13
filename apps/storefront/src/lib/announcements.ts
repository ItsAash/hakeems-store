import type { Announcement } from '@/lib/strapi/types';

/**
 * The marquee is toggled as a whole via `home-page.announcementBarEnabled`, not per
 * announcement. `null` means the row predates this field and must read as "on", the
 * same convention used by every other boolean toggle in this schema.
 */
export function getVisibleAnnouncements(
  announcementBarEnabled: boolean | null,
  announcements: Announcement[],
): Announcement[] {
  return announcementBarEnabled === false ? [] : announcements;
}
