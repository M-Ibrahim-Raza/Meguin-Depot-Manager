-- Custom SQL migration file, put your code below! --
UPDATE "user" SET "role" = 'admin' WHERE "role" = 'head';
UPDATE "user" SET "role" = 'user' WHERE "role" = 'clerk';
