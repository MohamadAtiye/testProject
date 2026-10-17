import { useLocation } from "react-router";
import { SITE_URL, seoForPath } from "../data/seo";

const OG_IMAGE = `${SITE_URL}/images/hero-lion-upscaled.jpg`;

/**
 * Per-route document metadata. React 19 hoists <title>, <meta> and <link> into
 * <head> automatically, so this renders wherever it is mounted.
 */
export default function Seo() {
  const { pathname } = useLocation();
  const { title, description, noindex } = seoForPath(pathname);
  const url = `${SITE_URL}${pathname}`;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <>
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Stadtlöwe" />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={description} />
          <meta property="og:url" content={url} />
          <meta property="og:image" content={OG_IMAGE} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={title} />
          <meta name="twitter:description" content={description} />
        </>
      )}
    </>
  );
}
