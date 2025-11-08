import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductRepository } from '../../database/repositories/product.repository';
import { MlClientModule } from '../../clients/ml/ml-client.module';

@Module({
  imports: [DatabaseModule, MlClientModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductRepository],
  exports: [ProductsService],
})
export class ProductsModule {}

