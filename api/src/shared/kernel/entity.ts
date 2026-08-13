import { UniqueEntityId } from './unique-entity-id';

export abstract class Entity<Props> {
  protected readonly _id: UniqueEntityId;
  protected readonly props: Props;

  protected constructor(props: Props, id?: UniqueEntityId) {
    this._id = id ?? new UniqueEntityId();
    this.props = props;
  }

  get id(): UniqueEntityId {
    return this._id;
  }

  equals(other?: Entity<Props>): boolean {
    if (!other) return false;
    if (this === other) return true;
    return this._id.equals(other._id);
  }
}
