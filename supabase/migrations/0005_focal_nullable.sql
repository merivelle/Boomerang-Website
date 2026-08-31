-- Focal point: NULL means "nobody has chosen one".
--
-- The columns were NOT NULL DEFAULT 0.5/0.38, which encoded the hero's
-- hard-coded object-[50%_38%] as if it were true of every image. It is not:
-- the work grid renders plain object-cover, which is 50%/50%. Applying the
-- default to the 110 migrated assets would silently re-crop every card in the
-- contact sheet.
--
-- Nullable is the honest shape. The 110 assets migrated from /public have
-- never had a focal point chosen, so they get NULL and each component keeps
-- the framing it already had. Newly uploaded posters get a real value from the
-- editor's picker.

alter table media
  alter column focal_x drop default,
  alter column focal_y drop default,
  alter column focal_x drop not null,
  alter column focal_y drop not null;

update media set focal_x = null, focal_y = null;
