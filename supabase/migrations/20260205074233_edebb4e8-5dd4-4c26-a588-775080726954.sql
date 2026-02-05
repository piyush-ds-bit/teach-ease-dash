-- Assign super_admin role to the main admin user
INSERT INTO public.user_roles (user_id, role)
VALUES ('262e21b5-a1c3-4c5b-a47c-51cce4ff3934', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;