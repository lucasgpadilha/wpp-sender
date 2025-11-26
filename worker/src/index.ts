import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import setup from './setup';
import processor from './processor';
import { Dispatcher } from './dispatcher';

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

async function main() {
    console.log('Worker starting...');

    // Run Setup
    await setup();

    // Start Dispatcher
    const dispatcher = new Dispatcher();
    dispatcher.start();

    // Start BullMQ Worker
    const worker = new Worker('wpp-queue', processor, {
        connection: {
            host: REDIS_HOST,
            port: REDIS_PORT,
            password: REDIS_PASSWORD
        },
        concurrency: 5 // Adjust based on needs
    });

    worker.on('completed', job => {
        console.log(`Job ${job.id} has completed!`);
    });

    worker.on('failed', (job, err) => {
        console.log(`Job ${job?.id} has failed with ${err.message}`);
    });

    console.log('Worker listening for jobs...');
}

main().catch(console.error);
