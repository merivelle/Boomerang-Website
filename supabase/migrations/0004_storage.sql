-- Boomerang Music CMS — storage buckets
--
-- Size and MIME limits are set per bucket: a server-side check you get for free
-- and cannot forget to write.
--
-- Note: the 110 assets already in /public STAY there. They are served free from
-- Vercel's edge; Supabase Storage reads count against a 5 GB/month egress quota
-- on the free tier, and Supabase image transformations are a paid feature — so
-- moving them buys nothing but a URL change. New uploads land here.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('stills',    'stills',    true,  26214400, array['image/jpeg','image/png','image/webp','image/avif']),
  ('logos',     'logos',     true,   5242880, array['image/png','image/webp','image/svg+xml']),
  ('og',        'og',        true,   5242880, array['image/jpeg','image/png']),
  ('hero',      'hero',      true,   5242880, array['image/jpeg']),
  ('clips',     'clips',     true,  52428800, array['video/mp4']),
  -- Private. The untouched upload, kept as the redo path when a normalization
  -- pass turns out to have been wrong. 1 GB free against 25 MB of current assets.
  ('originals', 'originals', false, 52428800, array['image/jpeg','image/png','image/webp','image/avif','image/tiff'])
on conflict (id) do nothing;
