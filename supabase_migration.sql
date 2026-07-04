-- Ejecutar una sola vez en el SQL editor de Supabase

create table if not exists gender_reveal (
  id int primary key default 1,
  color text check (color in ('pink', 'blue')),
  revealed_at timestamptz default now(),
  constraint single_row check (id = 1)
);

-- No insertamos nada acá: la fila se crea/actualiza desde el panel /admin
-- de la app (con la contraseña de ADMIN_PASSWORD).
