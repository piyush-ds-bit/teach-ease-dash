-- Assign admin role to piyushbusiness@example.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'piyushbusiness@example.com'
ON CONFLICT (user_id, role) DO NOTHING;