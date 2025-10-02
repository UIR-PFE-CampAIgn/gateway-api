import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SeedsModule } from './seeds.module';
import { SeedsService } from './seeds.service';

async function bootstrap() {
  const logger = new Logger('SeedRunner');
  const app = await NestFactory.createApplicationContext(SeedsModule, {
    logger: ['log', 'error', 'warn'],
  });
  try {
    const seeder = app.get(SeedsService);
    await seeder.run();
    logger.log('Seeding completed successfully.');
  } catch (e) {
    logger.error(`Seeding failed: ${(e as Error).message}`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();

