import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppConfigService } from '../../config/configuration';
import { USER_REPOSITORY } from './domain/repositories/user.repository';
import { REFRESH_TOKEN_REPOSITORY } from './domain/repositories/refresh-token.repository';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from './domain/repositories/password-reset-token.repository';
import { HASHER } from './application/ports/hasher.port';
import { TOKEN_SIGNER } from './application/ports/token-signer.port';
import { EMAIL_SENDER } from './application/ports/email-sender.port';
import { RefreshTokenIssuer } from './application/services/refresh-token-issuer.service';
import { UserDirectoryService } from './application/services/user-directory.service';
import { RegisterUserUseCase } from './application/use-cases/register-user/register-user.use-case';
import { AuthenticateUserUseCase } from './application/use-cases/authenticate-user/authenticate-user.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token/refresh-token.use-case';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user/get-current-user.use-case';
import { RequestPasswordResetUseCase } from './application/use-cases/request-password-reset/request-password-reset.use-case';
import { ResetPasswordUseCase } from './application/use-cases/reset-password/reset-password.use-case';
import { LogoutUseCase } from './application/use-cases/logout/logout.use-case';
import { UpdateProfileUseCase } from './application/use-cases/update-profile/update-profile.use-case';
import { UploadAvatarUseCase } from './application/use-cases/upload-avatar/upload-avatar.use-case';
import { DeleteAccountUseCase } from './application/use-cases/delete-account/delete-account.use-case';
import { ACCOUNT_CASCADE_DELETE } from './application/ports/account-cascade-delete.port';
import { AVATAR_UPLOADER } from './application/ports/avatar-uploader.port';
import { Argon2HasherAdapter } from './infrastructure/adapters/argon2-hasher.adapter';
import { JwtTokenSignerAdapter } from './infrastructure/adapters/jwt-token-signer.adapter';
import { ConsoleEmailSenderAdapter } from './infrastructure/adapters/console-email-sender.adapter';
import { MongoAccountCascadeDeleteAdapter } from './infrastructure/adapters/mongo-account-cascade-delete.adapter';
import { CloudinaryAvatarUploaderAdapter } from './infrastructure/adapters/cloudinary-avatar-uploader.adapter';
import {
  UserSchema,
  UserSchemaClass,
} from './infrastructure/persistence/user.schema';
import {
  RefreshTokenSchema,
  RefreshTokenSchemaClass,
} from './infrastructure/persistence/refresh-token.schema';
import {
  PasswordResetTokenSchema,
  PasswordResetTokenSchemaClass,
} from './infrastructure/persistence/password-reset-token.schema';
import { MongoUserRepository } from './infrastructure/persistence/mongo-user.repository';
import { MongoRefreshTokenRepository } from './infrastructure/persistence/mongo-refresh-token.repository';
import { MongoPasswordResetTokenRepository } from './infrastructure/persistence/mongo-password-reset-token.repository';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserSchemaClass.name, schema: UserSchema },
      { name: RefreshTokenSchemaClass.name, schema: RefreshTokenSchema },
      {
        name: PasswordResetTokenSchemaClass.name,
        schema: PasswordResetTokenSchema,
      },
    ]),
    JwtModule.registerAsync({
      global: false,
      useFactory: (config: AppConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: {
          expiresIn: config.get('JWT_ACCESS_TTL', { infer: true }),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: USER_REPOSITORY, useClass: MongoUserRepository },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: MongoRefreshTokenRepository,
    },
    {
      provide: PASSWORD_RESET_TOKEN_REPOSITORY,
      useClass: MongoPasswordResetTokenRepository,
    },
    { provide: HASHER, useClass: Argon2HasherAdapter },
    { provide: TOKEN_SIGNER, useClass: JwtTokenSignerAdapter },
    { provide: EMAIL_SENDER, useClass: ConsoleEmailSenderAdapter },
    {
      provide: ACCOUNT_CASCADE_DELETE,
      useClass: MongoAccountCascadeDeleteAdapter,
    },
    { provide: AVATAR_UPLOADER, useClass: CloudinaryAvatarUploaderAdapter },
    RefreshTokenIssuer,
    UserDirectoryService,
    RegisterUserUseCase,
    AuthenticateUserUseCase,
    RefreshTokenUseCase,
    GetCurrentUserUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    LogoutUseCase,
    UpdateProfileUseCase,
    UploadAvatarUseCase,
    DeleteAccountUseCase,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [UserDirectoryService],
})
export class IdentityModule {}
