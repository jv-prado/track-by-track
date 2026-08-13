import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const setTrackIgnoredSchema = z.object({
  ignored: z.boolean(),
});

export class SetTrackIgnoredDto extends createZodDto(setTrackIgnoredSchema) {}
