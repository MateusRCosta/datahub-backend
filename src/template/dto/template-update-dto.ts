import { PartialType } from '@nestjs/swagger';
import { CreateTemplateDto } from './template-create.dto';

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}
