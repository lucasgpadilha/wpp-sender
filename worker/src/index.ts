import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import setupSchema from './setup_schema';
import fixCascade from './fix_cascade';
import schemaMigrationV4 from './schema_migration_v4';
import schemaMigrationV5 from './schema_migration_v5';
import fixMissingFields from './fix_missing_fields';
import fixMediaRelation from './fix_media_relation';
import processor from './processor';
import { Calculator } from './calculator';
import { DispatcherV2 } from './dispatcher_v2';
import schemaMigrationV6 from './schema_migration_v6';
import fixUiDisplay from './fix_ui_display';

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

async function main() {
    console.log('Worker starting...');

    // Run Schema Setup & Fixes
    await setupSchema();
    await fixCascade();
    await schemaMigrationV4();
    await schemaMigrationV5();
    await fixMissingFields();
    await fixMediaRelation();
    await schemaMigrationV6();
    await fixUiDisplay();

    // Start Calculator
    const calculator = new Calculator();
    calculator.start();

    // Start Dispatcher V2
    const dispatcher = new DispatcherV2();
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
