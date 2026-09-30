-- Visitors reach the subscriber list only through subscribe_newsletter(); take away the default table grants.
revoke all on public.newsletter_subscribers from anon, authenticated;
