const state = {
  connected: false,
  uri: null,
};

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

const defaultExport = {
  connect,
  disconnect,
  connection,
};

export { connect, disconnect, connection };
export default defaultExport;
