const { TextEncoder, TextDecoder } = require('node:util');
const { ReadableStream, TransformStream, WritableStream } = require('node:stream/web');
const { MessageChannel, MessagePort } = require('node:worker_threads');
const { Blob, File } = require('node:buffer');

Object.assign(globalThis, {
  TextEncoder,
  TextDecoder,
  ReadableStream,
  TransformStream,
  WritableStream,
  MessageChannel,
  MessagePort,
  Blob,
  File,
});
