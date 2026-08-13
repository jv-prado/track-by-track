import { Email } from './email.vo';
import { InvalidEmailError } from '../errors/invalid-email.error';

describe('Email', () => {
  it('normaliza para minúsculas e remove espaços', () => {
    const email = Email.create('  Ana@Example.com  ');
    expect(email.value).toBe('ana@example.com');
  });

  it.each(['não-é-email', 'sem-arroba.com', '@sem-usuario.com', ''])(
    'rejeita e-mail inválido: %s',
    (invalid) => {
      expect(() => Email.create(invalid)).toThrow(InvalidEmailError);
    },
  );

  it('duas instâncias com o mesmo valor são iguais estruturalmente', () => {
    const a = Email.create('ana@example.com');
    const b = Email.create('ANA@EXAMPLE.COM');
    expect(a.equals(b)).toBe(true);
  });
});
