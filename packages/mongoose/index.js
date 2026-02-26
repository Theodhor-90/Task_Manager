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

  toJSON() {
    return this.value;
  }

  static isValid(input) {
    return typeof input === "string" && /^[a-f0-9]{24}$/.test(input);
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

// Auto-generate _id for plain objects in arrays (mimics Mongoose subdocuments)
function addSubdocumentIds(doc) {
  for (const value of Object.values(doc)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object" && !Array.isArray(item) && item._id === undefined) {
          item._id = new ObjectId();
        }
      }
    }
  }
}

function matchesValue(docValue, filterValue) {
  // Handle query operators
  if (filterValue && typeof filterValue === "object" && !Array.isArray(filterValue) && !(filterValue instanceof ObjectId)) {
    return Object.entries(filterValue).every(([op, operand]) => {
      switch (op) {
        case "$in":
          // If docValue is an array, check if any element is in the operand list
          if (Array.isArray(docValue)) {
            return docValue.some((item) =>
              operand.some((v) => String(item) === String(v)),
            );
          }
          return operand.some((v) => String(docValue) === String(v));
        case "$ne":
          return String(docValue) !== String(operand);
        case "$gte":
          return docValue >= operand;
        case "$gt":
          return docValue > operand;
        case "$lte":
          return docValue <= operand;
        case "$lt":
          return docValue < operand;
        default:
          return String(docValue) === String(filterValue);
      }
    });
  }

  // Plain value: if doc field is an array, check if it contains the filter value
  if (Array.isArray(docValue)) {
    return docValue.some((item) => String(item) === String(filterValue));
  }

  return String(docValue) === String(filterValue);
}

function model(name, schema) {
  if (!state.collections.has(name)) {
    state.collections.set(name, []);
  }

  const matches = (doc, filter = {}) => {
    return Object.entries(filter).every(([key, value]) => {
      return matchesValue(doc[key], value);
    });
  };

  const collection = () => state.collections.get(name);

  // Build a chainable query object that supports .populate() and .sort()
  function buildQuery(resultsFn) {
    let populateFields = [];
    let sortObj = null;

    const query = {
      populate(field) {
        // populate is a no-op in our in-memory mock (no refs to resolve),
        // but we must support the chain so routes don't crash.
        populateFields.push(field);
        return query;
      },
      sort(obj = {}) {
        sortObj = obj;
        return query;
      },
      then(resolve, reject) {
        try {
          let results = resultsFn();
          if (sortObj) {
            const key = Object.keys(sortObj)[0];
            if (key) {
              const dir = sortObj[key] === -1 ? -1 : 1;
              results.sort((a, b) => {
                if (a[key] < b[key]) return -1 * dir;
                if (a[key] > b[key]) return 1 * dir;
                return 0;
              });
            }
          }
          resolve(results);
        } catch (err) {
          reject(err);
        }
      },
    };

    return query;
  }

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
        toJSON() {
          const { toJSON, ...rest } = this;
          return { ...rest, _id: String(rest._id) };
        },
      };

      // Auto-generate _id for subdocument arrays
      addSubdocumentIds(created);

      if (schema?.options?.timestamps) {
        created.createdAt = now;
        created.updatedAt = now;
      }

      collection().push(created);
      return created;
    },
    findOne(filter = {}) {
      // Return a chainable query (supports .populate())
      const found = collection().find((doc) => matches(doc, filter)) ?? null;

      const query = {
        populate() {
          return query;
        },
        then(resolve, reject) {
          try {
            resolve(found);
          } catch (err) {
            reject(err);
          }
        },
      };

      return query;
    },
    async deleteMany(filter = {}) {
      const docs = collection();
      const kept = docs.filter((doc) => !matches(doc, filter));
      const deletedCount = docs.length - kept.length;
      state.collections.set(name, kept);
      return { deletedCount };
    },
    async deleteOne(filter = {}) {
      const docs = collection();
      const idx = docs.findIndex((doc) => matches(doc, filter));
      if (idx === -1) return { deletedCount: 0 };
      docs.splice(idx, 1);
      return { deletedCount: 1 };
    },
    find(filter = {}) {
      const results = collection().filter((doc) => matches(doc, filter));
      return buildQuery(() => results);
    },
    async findOneAndUpdate(filter = {}, update = {}, options = {}) {
      const doc = collection().find((d) => matches(d, filter));
      if (!doc) return null;
      Object.assign(doc, update);
      if (schema?.options?.timestamps) {
        doc.updatedAt = new Date();
      }
      return doc;
    },
    async updateMany(filter = {}, update = {}) {
      const docs = collection().filter((doc) => matches(doc, filter));
      let modifiedCount = 0;

      for (const doc of docs) {
        // Handle $pull operator
        if (update.$pull) {
          for (const [field, value] of Object.entries(update.$pull)) {
            if (Array.isArray(doc[field])) {
              const before = doc[field].length;
              doc[field] = doc[field].filter(
                (item) => String(item) !== String(value),
              );
              if (doc[field].length !== before) modifiedCount++;
            }
          }
        }

        // Handle $set operator
        if (update.$set) {
          Object.assign(doc, update.$set);
          modifiedCount++;
        }

        if (schema?.options?.timestamps) {
          doc.updatedAt = new Date();
        }
      }

      return { matchedCount: docs.length, modifiedCount };
    },
  };
}

const defaultExport = {
  connect,
  disconnect,
  connection,
  model,
  Types,
  Schema,
};

export { Schema, Types, connect, disconnect, connection, model };
export default defaultExport;
