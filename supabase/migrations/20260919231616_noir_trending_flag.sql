-- The home page "Trending Products" row now shows the first four products flagged `popular`.
-- Product 4 was the only unflagged item of the original four, so flag it to keep the same lineup.
update public.products set popular = true where id = 4;
