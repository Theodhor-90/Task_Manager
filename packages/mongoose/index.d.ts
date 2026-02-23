export interface Connection {
  readonly readyState: number;
}

export interface Mongoose {
  connect(uri: string): Promise<Mongoose>;
  disconnect(): Promise<void>;
  connection: Connection;
}

declare const mongoose: Mongoose;

export declare function connect(uri: string): Promise<Mongoose>;
export declare function disconnect(): Promise<void>;
export declare const connection: Connection;
export default mongoose;
