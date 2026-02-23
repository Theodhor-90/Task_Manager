const state = {
  connected: false,
  uri: null,
};

class Schema {
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

export { Schema, connect, disconnect, connection, model };
export default defaultExport;
