import { Feedback } from './feedback.aggregate';
import { InvalidFeedbackStatusError } from '../errors/invalid-feedback-status.error';

describe('Feedback Aggregate', () => {
  it('cria um feedback com status open e adiciona a primeira mensagem', () => {
    const feedback = Feedback.create({
      userId: 'user-1',
      subject: 'Problema no ranking',
      message: 'Não consigo avaliar algumas músicas.',
    });

    expect(feedback.userId).toBe('user-1');
    expect(feedback.subject).toBe('Problema no ranking');
    expect(feedback.status).toBe('open');
    expect(feedback.messages).toHaveLength(1);
    expect(feedback.messages[0]!.userId).toBe('user-1');
    expect(feedback.messages[0]!.adminId).toBeUndefined();
    expect(feedback.messages[0]!.message).toBe(
      'Não consigo avaliar algumas músicas.',
    );
    expect(feedback.messages[0]!.isAdmin).toBe(false);
  });

  it('quando o admin responde, status muda para answered', () => {
    const feedback = Feedback.create({
      userId: 'user-1',
      subject: 'Problema no ranking',
      message: 'Não consigo avaliar algumas músicas.',
    });

    feedback.addMessage(
      { id: 'admin-1', isAdmin: true },
      'Estamos verificando seu relato.',
    );

    expect(feedback.status).toBe('answered');
    expect(feedback.messages).toHaveLength(2);
    expect(feedback.messages[1]!.adminId).toBe('admin-1');
    expect(feedback.messages[1]!.userId).toBeUndefined();
    expect(feedback.messages[1]!.isAdmin).toBe(true);
    expect(feedback.lastMessage?.message).toBe(
      'Estamos verificando seu relato.',
    );
  });

  it('quando o usuário responde novamente, status volta para open', () => {
    const feedback = Feedback.create({
      userId: 'user-1',
      subject: 'Sugestão',
      message: 'Poderiam adicionar modo escuro?',
    });

    feedback.addMessage({ id: 'admin-1', isAdmin: true }, 'Já temos!');
    expect(feedback.status).toBe('answered');

    feedback.addMessage(
      { id: 'user-1', isAdmin: false },
      'Onde fica a opção no menu?',
    );
    expect(feedback.status).toBe('open');
    expect(feedback.messages).toHaveLength(3);
  });

  it('admin consegue alterar status manualmente para closed e reabrir ao receber nova mensagem do usuário', () => {
    const feedback = Feedback.create({
      userId: 'user-1',
      subject: 'Dúvida',
      message: 'Como funciona a nota?',
    });

    feedback.changeStatus('closed');
    expect(feedback.status).toBe('closed');

    // Usuário envia nova mensagem -> reabre para 'open'
    feedback.addMessage(
      { id: 'user-1', isAdmin: false },
      'Ainda tenho dúvidas.',
    );
    expect(feedback.status).toBe('open');
  });

  it('rejeita status inválido', () => {
    const feedback = Feedback.create({
      userId: 'user-1',
      message: 'Olá',
    });

    expect(() => feedback.changeStatus('invalid' as never)).toThrow(
      InvalidFeedbackStatusError,
    );
  });
});
