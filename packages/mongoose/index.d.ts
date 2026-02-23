export interface Connection {
  readonly readyState: number;
}

export interface Document {
  _id?: unknown;
}

export interface SchemaOptions {
  timestamps?: boolean;
}

export namespace Types {
  class ObjectId {
    constructor(value?: string);
    toString(): string;
  }

  interface DocumentArray<T> extends Array<T> {}
}

export const Types: {
  ObjectId: typeof Types.ObjectId;
};

export class Schema<T = unknown> {
  constructor(definition: Record<string, unknown>, options?: SchemaOptions);
  static Types: {
    ObjectId: typeof Types.ObjectId;
  };
  readonly definition: Record<string, unknown>;
  readonly options: SchemaOptions;
}

export interface Model<T = unknown> {
  readonly modelName: string;
  readonly schema: Schema<T>;
  countDocuments(filter?: Partial<T> & Record<string, unknown>): Promise<number>;
  create(doc: Partial<T> & Record<string, unknown>): Promise<T & Document>;
  findOne(
    filter?: Partial<T> & Record<string, unknown>
  ): Promise<(T & Document) | null>;
  deleteMany(
    filter?: Partial<T> & Record<string, unknown>
  ): Promise<{ deletedCount: number }>;
}

export interface Mongoose {
  connect(uri: string): Promise<Mongoose>;
  disconnect(): Promise<void>;
  connection: Connection;
  model<T = unknown>(name: string, schema: Schema<T>): Model<T>;
}

declare const mongoose: Mongoose;

export declare function connect(uri: string): Promise<Mongoose>;
export declare function disconnect(): Promise<void>;
export declare const connection: Connection;
export declare function model<T = unknown>(
  name: string,
  schema: Schema<T>
): Model<T>;
export default mongoose;
