"use client";

import { useEffect, useState } from "react";
import { getPublishedCmsPageAction } from "@/app/admin/cms-actions";

/**
 * React hook to retrieve published CMS content for any public or LMS page.
 * Returns a dictionary of sections and fields: cms[sectionId]?.[fieldId]
 * Seamlessly updates if new published content is available.
 */
export function useCmsContent(pageKey: string): Record<string, Record<string, any>> {
  const [content, setContent] = useState<Record<string, Record<string, any>>>({});

  useEffect(() => {
    let isMounted = true;

    getPublishedCmsPageAction(pageKey)
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setContent(res.data);
        }
      })
      .catch(() => {
        // Fall back gracefully
      });

    return () => {
      isMounted = false;
    };
  }, [pageKey]);

  return content;
}
