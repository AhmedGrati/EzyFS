import {BadRequestException} from '@nestjs/common';
import {Repository} from 'typeorm';
import {CryptoService} from '../../../crypto/crypto.service';
import {CompDecompType} from '@ezyfs/common/enums/comp-decomp-type.enum';
import {EncDecType} from '@ezyfs/common/enums/enc-dec-type.enum';
import {UserService} from '../../../user/user.service';
import {CreateJobInput} from '../../dto/create-job.input';
import {QueuedJob} from '@ezyfs/repositories/entities';
import {JobInventory} from '../../inventories/Job-inventory';
import {QueueInventory} from '../../inventories/Queue-inventory';
import {createDecompressionJob} from '../concrete/create-decompression-job';

export default function decompressionFactory(
  type: CompDecompType,
): (
  createJobInput: CreateJobInput,
  userService: UserService,
  jobRepo: JobInventory,
  QI: QueueInventory,
  cryptoService: CryptoService,
) => Promise<QueuedJob> {
  switch (type) {
    default:
      return createDecompressionJob;
  }
}
