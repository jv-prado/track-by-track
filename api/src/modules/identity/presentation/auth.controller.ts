import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  ParseFilePipe,
  Patch,
  Post,
  Req,
  Res,
  Get,
  Inject,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../shared/infrastructure/decorators/public.decorator';
import { CurrentUser } from '../../../shared/infrastructure/decorators/current-user.decorator';
import type { AppConfigService } from '../../../config/configuration';
import { RegisterUserUseCase } from '../application/use-cases/register-user/register-user.use-case';
import { AuthenticateUserUseCase } from '../application/use-cases/authenticate-user/authenticate-user.use-case';
import { RefreshTokenUseCase } from '../application/use-cases/refresh-token/refresh-token.use-case';
import { GetCurrentUserUseCase } from '../application/use-cases/get-current-user/get-current-user.use-case';
import { RequestPasswordResetUseCase } from '../application/use-cases/request-password-reset/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../application/use-cases/reset-password/reset-password.use-case';
import { LogoutUseCase } from '../application/use-cases/logout/logout.use-case';
import { UpdateProfileUseCase } from '../application/use-cases/update-profile/update-profile.use-case';
import { UploadAvatarUseCase } from '../application/use-cases/upload-avatar/upload-avatar.use-case';
import { DeleteAccountUseCase } from '../application/use-cases/delete-account/delete-account.use-case';
import { InvalidRefreshTokenError } from '../domain/errors/invalid-refresh-token.error';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { RequestPasswordResetDto } from './dtos/request-password-reset.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { DeleteAccountDto } from './dtos/delete-account.dto';
import {
  CurrentUserResponseDto,
  LoginResponseDto,
  MessageResponseDto,
  ProfileResponseDto,
  RefreshResponseDto,
  RegisterResponseDto,
} from './dtos/auth.responses';

const REFRESH_COOKIE = 'refreshToken';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(RegisterUserUseCase)
    private readonly registerUser: RegisterUserUseCase,
    @Inject(AuthenticateUserUseCase)
    private readonly authenticateUser: AuthenticateUserUseCase,
    @Inject(RefreshTokenUseCase)
    private readonly refreshToken: RefreshTokenUseCase,
    @Inject(GetCurrentUserUseCase)
    private readonly getCurrentUser: GetCurrentUserUseCase,
    @Inject(RequestPasswordResetUseCase)
    private readonly requestPasswordReset: RequestPasswordResetUseCase,
    @Inject(ResetPasswordUseCase)
    private readonly resetPassword: ResetPasswordUseCase,
    @Inject(LogoutUseCase) private readonly logout: LogoutUseCase,
    @Inject(UpdateProfileUseCase)
    private readonly updateProfile: UpdateProfileUseCase,
    @Inject(UploadAvatarUseCase)
    private readonly uploadAvatar: UploadAvatarUseCase,
    @Inject(DeleteAccountUseCase)
    private readonly deleteAccount: DeleteAccountUseCase,
    @Inject(ConfigService) private readonly config: AppConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiCreatedResponse({ type: RegisterResponseDto })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.registerUser.execute(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LoginResponseDto })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authenticateUser.execute(dto);
    this.setRefreshCookie(
      res,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RefreshResponseDto })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) {
      throw new InvalidRefreshTokenError();
    }
    const result = await this.refreshToken.execute({ refreshToken: token });
    this.setRefreshCookie(
      res,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );
    return { accessToken: result.accessToken };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: MessageResponseDto })
  @Post('logout')
  async logoutRoute(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (token) {
      await this.logout.execute({ refreshToken: token });
    }
    res.clearCookie(REFRESH_COOKIE);
    return { message: 'Logout realizado.' };
  }

  @ApiOkResponse({ type: CurrentUserResponseDto })
  @Get('me')
  async me(@CurrentUser() user: { sub: string; email: string }) {
    return this.getCurrentUser.execute({ userId: user.sub });
  }

  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ProfileResponseDto })
  @Patch('me')
  async updateMe(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: { sub: string; email: string },
  ) {
    return this.updateProfile.execute({
      userId: user.sub,
      displayName: dto.displayName,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: ProfileResponseDto })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { avatar: { type: 'string', format: 'binary' } },
    },
  })
  async uploadAvatarRoute(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: { sub: string; email: string },
  ) {
    return this.uploadAvatar.execute({
      userId: user.sub,
      file: file.buffer,
    });
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('me')
  async deleteMe(
    @Body() dto: DeleteAccountDto,
    @CurrentUser() user: { sub: string; email: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.deleteAccount.execute({
      userId: user.sub,
      password: dto.password,
    });
    res.clearCookie(REFRESH_COOKIE);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: MessageResponseDto })
  @Post('password-reset/request')
  async requestReset(@Body() dto: RequestPasswordResetDto) {
    return this.requestPasswordReset.execute(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: MessageResponseDto })
  @Post('password-reset/confirm')
  async confirmReset(@Body() dto: ResetPasswordDto) {
    return this.resetPassword.execute(dto);
  }

  private setRefreshCookie(
    res: Response,
    token: string,
    expiresAt: Date,
  ): void {
    const isProduction =
      this.config.get('NODE_ENV', { infer: true }) === 'production';
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
      expires: expiresAt,
    });
  }
}
