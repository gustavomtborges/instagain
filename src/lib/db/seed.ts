import * as schema from '$lib/db/schema';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import type { InstagramGiveaway } from '$lib/db/schema';
import { Argon2id } from 'oslo/password';
import { generateId } from 'lucia';
import sqlite from 'better-sqlite3';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not defined');
}
const client = sqlite(process.env.DATABASE_URL);
client.pragma('journal_mode=WAL');
client.pragma('synchronous=normal');
client.pragma('foreign_keys=on');

const db = drizzle(client, { schema });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedGiveaways() {
	console.log('delete instagram_giveaways...');
	await db.delete(schema.instagramGiveaways);

	const rows: InstagramGiveaway[] = [];
	fs.createReadStream(path.join(__dirname, './seed.csv'))
		.pipe(csv())
		.on('data', (data) => {
			rows.push(data);
		})
		.on('end', async () => {
			const values = rows.map((row) => {
				return {
					endDate: row.endDate,
					link: row.link,
					category: row.category,
					shouldFollow: !!row.shouldFollow,
					shouldFollowOthers: !!row.shouldFollowOthers,
					shouldComment: !!row.shouldComment,
					shouldMention: !!row.shouldMention,
					isDraft: !!row.isDraft
				};
			});
			await db.insert(schema.instagramGiveaways).values(values);
			console.log('Seed done');
		});
}

async function seedUsers() {
	console.log('delete users...');
	await db.delete(schema.emailVerificationCodes);
	await db.delete(schema.sessions);
	await db.delete(schema.users);

	const hashedPassword = await new Argon2id().hash('abcd1234');

	await db.insert(schema.users).values({
		id: generateId(15),
		fullName: 'Test User',
		email: 'user@test.com',
		emailVerified: true,
		hashedPassword,
		isAdmin: true
	});
}

async function seed() {
	await seedGiveaways();
	await seedUsers();
	client.close();
}

seed();
