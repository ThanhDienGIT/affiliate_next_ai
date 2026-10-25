import { isAdmin, json } from '../../../lib/auth';
import { hasDb } from '../../../lib/store';

export async function GET() { return json({ admin: await isAdmin(), db: hasDb() }); }
