import type { Service } from '../../src/types.js'

export const ciServices: Service[] = [
  {
    id: "toolbox",
    name: "ASD-toolbox",
    url: "http://localhost:8000/asd/toolbox",
    type: "api",
    maxInstances: 20,
    config: {
      minColumns: 1,
      maxColumns: 4,
      minRows: 1,
      maxRows: 4,
    },
  },
  {
    id: "terminal",
    name: "ASD-terminal",
    url: "http://localhost:8000/asd/terminal",
    type: "web",
    maxInstances: 20,
    config: {
      minColumns: 2,
      maxColumns: 6,
      minRows: 2,
      maxRows: 6,
    },
  },
  {
    id: "tunnel",
    name: "ASD-tunnel",
    url: "http://localhost:8000/asd/tunnel",
    type: "web",
    maxInstances: 20,
    config: {
      minColumns: 1,
      maxColumns: 6,
      minRows: 1,
      maxRows: 6,
    },
  },
  {
    id: "containers",
    name: "ASD-containers",
    url: "http://localhost:8000/asd/containers",
    type: "web",
    maxInstances: 20,
    config: {
      minColumns: 2,
      maxColumns: 4,
      minRows: 2,
      maxRows: 6,
    },
  },
  {
    id: "templated",
    name: "ASD-templated",
    url: "http://localhost:8000/asd/templated",
    type: "web",
    template: "twoByTwo",
    maxInstances: 20,
    config: {},
  },
];
