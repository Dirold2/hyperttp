import { HyperClient } from "./src";

const client = new HyperClient({
  verbose: true,
  responseConverter: {
    maxBodySize: 0,
    charset: "utf-8",
  },
});

const html = await client.get(
  "https://jsonplaceholder.typicode.com/todos/1",
  `json`,
);
console.log(html);
