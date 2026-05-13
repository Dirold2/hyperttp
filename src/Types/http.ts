export type LogLevel = "debug" | "info" | "warn" | "error";

export type Method =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "OPTIONS"
  | "DELETE"
  | "HEAD";

export type ResponseType =
  | "auto"
  | "json"
  | "text"
  | "xml"
  | "html"
  | "buffer"
  | "stream";

export type SourceType = "json" | "xml" | "html" | "text" | "buffer";
