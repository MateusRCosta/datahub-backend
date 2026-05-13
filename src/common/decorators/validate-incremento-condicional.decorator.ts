import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { TipoCampo } from 'src/base-dados/util/type';
import { IntegracaoVariavelIncrementoDto } from 'src/integracao/dto/integracao-variavel-incremento-dto';
import { IntegracaoVariavelDto } from 'src/integracao/dto/integracao-variavel-dto';

function incrementoPermitidoPorTipo(
  tipo: TipoCampo,
  incremento?: IntegracaoVariavelIncrementoDto | null,
) {
  if (!incremento?.incrementa) return true;

  const tipoPermiteIncremento =
    tipo === TipoCampo.NUMERO ||
    tipo === TipoCampo.UTC ||
    tipo === TipoCampo.MM_DD_YYYY ||
    tipo === TipoCampo.DD_MM_YYYY;

  if (!tipoPermiteIncremento) return false;

  if (tipo === TipoCampo.NUMERO) {
    return (
      incremento.limiteIncrementa !== null &&
      incremento.limiteIncrementa !== undefined
    );
  }

  const temLimiteIncrementa =
    incremento.limiteIncrementa !== null &&
    incremento.limiteIncrementa !== undefined;
  const temLimiteDataAtual =
    incremento.limiteDataAtual !== null &&
    incremento.limiteDataAtual !== undefined;
  const temDelimitador =
    incremento.delimitador !== null && incremento.delimitador !== undefined;

  if (incremento.limiteDataAtual) {
    return temLimiteDataAtual && temDelimitador;
  }

  return temLimiteIncrementa && temLimiteDataAtual && temDelimitador;
}

export function ValidateIncrementoCondicional(
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'ValidateIncrementoCondicional',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(
          value: IntegracaoVariavelIncrementoDto | null,
          args: ValidationArguments,
        ) {
          const objectPai = args.object as IntegracaoVariavelDto;
          return incrementoPermitidoPorTipo(objectPai.tipo, value);
        },
        defaultMessage() {
          return 'Incremento so pode ser usado para numeros ou datas e precisa respeitar os campos obrigatorios do tipo';
        },
      },
    });
  };
}
