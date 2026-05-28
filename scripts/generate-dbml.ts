import { pgGenerate } from "drizzle-dbml-generator";

import * as schema from "../src/server/db/schema";

const out = "./schema.dbml";
const relational = true;

pgGenerate({ schema, out, relational });

console.log(`DBML generated at ${out}`);
