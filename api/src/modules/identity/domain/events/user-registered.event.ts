import { DomainEvent } from '../../../../shared/kernel/domain-event';

export class UserRegisteredEvent extends DomainEvent {
  constructor(
    readonly userId: string,
    readonly email: string,
  ) {
    super();
  }
}
