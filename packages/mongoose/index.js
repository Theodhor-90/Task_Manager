import { randomBytes } from "node:crypto";

const state = {
  connected: false,
  uri: null,
  collections: new Map(),
};

class ObjectId {
  constructor(value) {
    this.value = value ?? randomBytes(12).toString("hex");
  }

  toString() {
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

  constructor(definition, options = {}) {
    this.definition = definition;
    this.options = options;
  }
}

async function connect(uri) {
  state.connected = true;
  state.uri = uri;
  return defaultExport;
}

async function disconnect() {
  state.connected = false;
  state.uri = null;
}

const connection = {
  get readyState() {
    return state.connected ? 1 : 0;
  },
};

function model(name, schema) {
  if (!state.collections.has(name)) {
    state.collections.set(name, []);
  }

  const matches = (doc, filter = {}) => {
    return Object.entries(filter).every(([key, value]) => doc[key] === value);
  };

  const collection = () => state.collections.get(name);

  return {
    modelName: name,
    schema,
    async countDocuments(filter = {}) {
      return collection().filter((doc) => matches(doc, filter)).length;
    },
    async create(doc) {
      const now = new Date();
      const created = {
        ...doc,
        _id: new ObjectId(),
      };

      if (schema?.options?.timestamps) {
        created.createdAt = now;
        created.updatedAt = now;
      }

      collection().push(created);
      return created;
    },
    async findOne(filter = {}) {
      const found = collection().find((doc) => matches(doc, filter));
      return found ?? null;
    },
    async deleteMany(filter = {}) {
      const docs = collection();
      const kept = docs.filter((doc) => !matches(doc, filter));
      const deletedCount = docs.length - kept.length;
      state.collections.set(name, kept);
      return { deletedCount };
    },
  };
}

const defaultExport = {
  connect,
  disconnect,
  connection,
  model,
};

export { Schema, Types, connect, disconnect, connection, model };
export default defaultExport;
