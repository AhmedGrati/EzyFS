import {Module} from '@nestjs/common';
import {ConsulModule} from 'nestjs-consul';
import {ConsulServiceKeys} from '../enums';

@Module({
  imports: [
    ConsulModule.forRoot({
      keys: [
        {
          key: ConsulServiceKeys.REGISTRATION_AUTHORITY as string,
        },
        {
          key: ConsulServiceKeys.CORE as string,
        },
        {key: ConsulServiceKeys.API_GATEWAY as string},
      ],
      updateCron: '* * * * * *',
      connection: {
        protocol: 'http',
        port: 8500,
        host: 'localhost',
        token: '',
      },
    }),
  ],
})
export class ConsulConfigModule {}
