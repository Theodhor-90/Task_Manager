import { randomBytes } from "node:crypto";

const state = {
  connected: false,
  uri: null as string | null,
  collections: new Map<string, Record<string, unknown>[]>(),
};

class ObjectId {
  value: string;

  constructor(value?: string) {
    this.value = value ?? randomBytes(12).toString("hex");
  }

  static isValid(value: unknown): boolean {
    if (value instanceof ObjectId) {
      return true;
    }

    if (typeof value === "string") {
      return /^[a-f0-9]{24}$/i.test(value);
    }

    return false;
  }

  toString(): string {
    return this.value;
  }
}

const Types = {
  ObjectId,
};

class Schema {
  static Types = {
    ObjectId,
  };

  definition: Record<string, any>;
  options: Record<string, unknown>;

  constructor(definition: Record<string, any>, options: Record<string, unknown> = {}) {
    this.definition = definition;
    this.options = options;
  }

  path(fieldName: string): { options: Record<string, unknown> } | undefined {
    const field = this.definition[fieldName];
    if (!field) {
      return undefined;
    }

    if (Array.isArray(field)) {
      return { options: {} };
    }

    return { options: field };
  }
}

function isObjectId(value: unknown): value is ObjectId {
  return value instanceof ObjectId;
}

function normalizeForCompare(value: unknown): unknown {
  if (isObjectId(value)) {
    return value.toString();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    typeof (value as { value?: unknown }).value === "string"
  ) {
    return (value as { value: string }).value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeForCompare(item));
  }

  return value;
}

function matches(doc: Record<string, unknown>, filter: Record<string, unknown> = {}): boolean {
  return Object.entries(filter).every(([key, value]) => {
    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      !(value instanceof ObjectId)
    ) {
      const operators = value as Record<string, unknown>;
      if ("$in" in operators) {
        const list = operators.$in as unknown[];
        const docVal = normalizeForCompare(doc[key]);
        return list.some((item) => normalizeForCompare(item) === docVal);
      }
    }
    return normalizeForCompare(doc[key]) === normalizeForCompare(value);
  });
}

function createValidationError(): Error {
  return new Error("Validation failed");
}

function createDuplicateKeyError(): Error & { code: number } {
  const error = new Error("Duplicate key error") as Error & { code: number };
  error.code = 11000;
  return error;
}

function applyStringOptions(value: unknown, definition: Record<string, any>): unknown {
  let next = value;

  if (typeof next === "string") {
    if (definition.trim) {
      next = next.trim();
    }

    if (definition.lowercase) {
      next = next.toLowerCase();
    }
  }

  if (definition.enum && next !== undefined && !definition.enum.includes(next)) {
    throw createValidationError();
  }

  return next;
}

function applySubSchema(doc: Record<string, unknown>, schema: Schema): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const [fieldName, definition] of Object.entries(schema.definition)) {
    let value = doc[fieldName];

    if (value === undefined && definition.default !== undefined) {
      value = typeof definition.default === "function"
        ? definition.default()
        : definition.default;
    }

    if (definition.required && value === undefined) {
      throw createValidationError();
    }

    value = applyStringOptions(value, definition);
    output[fieldName] = value;
  }

  if (output._id === undefined) {
    output._id = new ObjectId();
  }

  return output;
}

function applyFieldDefinition(value: unknown, definition: Record<string, any> | Schema[]): unknown {
  if (Array.isArray(definition)) {
    const itemDefinition = definition[0];

    if (value === undefined) {
      return [];
    }

    if (!Array.isArray(value)) {
      throw createValidationError();
    }

    if (itemDefinition instanceof Schema) {
      return value.map((item) => applySubSchema((item ?? {}) as Record<string, unknown>, itemDefinition));
    }

    return value;
  }

  let next = value;

  if (next === undefined && definition.default !== undefined) {
    next = typeof definition.default === "function"
      ? definition.default()
      : definition.default;
  }

  if (definition.required && next === undefined) {
    throw createValidationError();
  }

  return applyStringOptions(next, definition);
}

function collectUniqueFields(schema: Schema): string[] {
  const fields: string[] = [];

  for (const [fieldName, definition] of Object.entries(schema.definition)) {
    if (!Array.isArray(definition) && definition.unique) {
      fields.push(fieldName);
    }
  }

  return fields;
}

function getCollectionDocs(name: string): Record<string, unknown>[] {
  return state.collections.get(name) ?? [];
}

function setCollectionDocs(name: string, docs: Record<string, unknown>[]): void {
  state.collections.set(name, docs);
}

function getCollectionsObject(): Record<string, { deleteMany: (filter?: Record<string, unknown>) => Promise<{ deletedCount: number }> }> {
  const collections: Record<
    string,
    { deleteMany: (filter?: Record<string, unknown>) => Promise<{ deletedCount: number }> }
  > = {};

  for (const [name] of state.collections.entries()) {
    collections[name] = {
      deleteMany: async (filter: Record<string, unknown> = {}) => {
        const docs = getCollectionDocs(name);
        const kept = docs.filter((doc) => !matches(doc, filter));
        const deletedCount = docs.length - kept.length;
        setCollectionDocs(name, kept);
        return { deletedCount };
      },
    };
  }

  return collections;
}

async function connect(uri: string): Promise<typeof defaultExport> {
  state.connected = true;
  state.uri = uri;
  return defaultExport;
}

async function disconnect(): Promise<void> {
  state.connected = false;
  state.uri = null;
}

const connection = {
  get readyState(): number {
    return state.connected ? 1 : 0;
  },
  get collections() {
    return getCollectionsObject();
  },
  async dropDatabase(): Promise<void> {
    state.collections.clear();
  },
};

function model(name: string, schema: Schema) {
  if (!state.collections.has(name)) {
    state.collections.set(name, []);
  }

  const uniqueFields = collectUniqueFields(schema);

  return {
    modelName: name,
    schema,
    async countDocuments(filter: Record<string, unknown> = {}): Promise<number> {
      return getCollectionDocs(name).filter((doc) => matches(doc, filter)).length;
    },
    async create(doc: Record<string, unknown>): Promise<Record<string, unknown>> {
      const docs = getCollectionDocs(name);
      const next: Record<string, unknown> = {};

      for (const [fieldName, definition] of Object.entries(schema.definition)) {
        const value = doc[fieldName];
        next[fieldName] = applyFieldDefinition(value, definition as Record<string, any> | Schema[]);
      }

      for (const fieldName of uniqueFields) {
        if (next[fieldName] === undefined) {
          continue;
        }

        const duplicate = docs.find((existing) => {
          return normalizeForCompare(existing[fieldName]) === normalizeForCompare(next[fieldName]);
        });

        if (duplicate) {
          throw createDuplicateKeyError();
        }
      }

      const now = new Date();
      const created: Record<string, unknown> = {
        ...doc,
        ...next,
        _id: new ObjectId(),
      };

      if (schema?.options?.timestamps) {
        created.createdAt = now;
        created.updatedAt = now;
      }

      docs.push(created);
      setCollectionDocs(name, docs);
      return created;
    },
    async findOne(filter: Record<string, unknown> = {}): Promise<Record<string, unknown> | null> {
      const found = getCollectionDocs(name).find((doc) => matches(doc, filter));
      return found ?? null;
    },
    async findOneAndUpdate(
      filter: Record<string, unknown>,
      update: Record<string, unknown>,
      options: Record<string, unknown> = {},
    ): Promise<Record<string, unknown> | null> {
      const docs = getCollectionDocs(name);
      const index = docs.findIndex((doc) => matches(doc, filter));
      if (index === -1) {
        return null;
      }

      const preUpdateDoc = { ...docs[index] };
      const fields = (update.$set ?? update) as Record<string, unknown>;
      for (const [key, value] of Object.entries(fields)) {
        if (key.startsWith("$")) continue;
        docs[index][key] = value;
      }

      if (schema?.options?.timestamps) {
        docs[index].updatedAt = new Date();
      }

      setCollectionDocs(name, docs);
      return options.new ? docs[index] : preUpdateDoc;
    },
    find(filter: Record<string, unknown> = {}) {
      const results = getCollectionDocs(name).filter((doc) => matches(doc, filter));
      const query = {
        _results: results,
        sort(sortObj: Record<string, unknown>) {
          const field = Object.keys(sortObj)[0];
          const direction = sortObj[field] === -1 || sortObj[field] === "desc" ? -1 : 1;
          this._results.sort((a, b) => {
            const aVal = a[field];
            const bVal = b[field];

            if (aVal instanceof Date && bVal instanceof Date) {
              return direction === -1
                ? bVal.getTime() - aVal.getTime()
                : aVal.getTime() - bVal.getTime();
            }

            if (aVal === bVal) {
              return 0;
            }

            if (direction === -1) {
              return aVal > bVal ? -1 : 1;
            }

            return aVal < bVal ? -1 : 1;
          });
          return this;
        },
        select() {
          return this;
        },
        lean() {
          return this;
        },
        then(onfulfilled?: (value: Record<string, unknown>[]) => unknown, onrejected?: (reason: unknown) => unknown) {
          return Promise.resolve(this._results).then(onfulfilled, onrejected);
        },
      };
      return query;
    },
    async deleteMany(filter: Record<string, unknown> = {}): Promise<{ deletedCount: number }> {
      const docs = getCollectionDocs(name);
      const kept = docs.filter((doc) => !matches(doc, filter));
      const deletedCount = docs.length - kept.length;
      setCollectionDocs(name, kept);
      return { deletedCount };
    },
    async deleteOne(filter: Record<string, unknown> = {}): Promise<{ deletedCount: number }> {
      const docs = getCollectionDocs(name);
      const index = docs.findIndex((doc) => matches(doc, filter));
      if (index === -1) {
        return { deletedCount: 0 };
      }
      docs.splice(index, 1);
      setCollectionDocs(name, docs);
      return { deletedCount: 1 };
    },
  };
}

const defaultExport = {
  connect,
  disconnect,
  connection,
  model,
  Schema,
  Types,
};

export { Schema, Types, connect, disconnect, connection, model };
export default defaultExport;
