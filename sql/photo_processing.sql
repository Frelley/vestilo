alter table products
  add column if not exists original_photos text[],
  add column if not exists photo_processing_status text,
  add column if not exists photo_processed_at timestamptz,
  add column if not exists photo_processing_error text,
  add column if not exists photo_processing_model text;

alter table products
  drop constraint if exists products_photo_processing_status_check;

alter table products
  add constraint products_photo_processing_status_check
  check (
    photo_processing_status is null
    or photo_processing_status in ('pending', 'processing', 'done', 'failed')
  );
