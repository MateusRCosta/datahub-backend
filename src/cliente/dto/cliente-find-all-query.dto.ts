import { IsOptional } from 'class-validator';
import { IsIdValid } from 'src/common/decorators/is-id-value.decorator';
import { IsTextField } from 'src/common/decorators/is-text-field-value.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

export class ClienteFindAllQueryDto extends PaginationQueryDto {
  @IsIdValid()
  @IsOptional()
  readonly id?: number;

  @IsIdValid()
  @IsOptional()
  readonly baseDeDadosId?: number;

  @IsTextField(
    64,
    '021fb596db81e6d02bf3d2586ee3981fe519f275c0ac9ca76bbcf2ebb4097d96',
  )
  @IsOptional()
  readonly hash?: string;
}
