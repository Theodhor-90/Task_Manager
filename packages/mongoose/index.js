import { randomBytes } from "node:crypto";

const state = {
  connected: false,
  uri: null,
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
  return {
    modelName: name,
    schema,
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
