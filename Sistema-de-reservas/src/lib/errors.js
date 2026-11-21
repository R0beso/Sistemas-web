'use strict';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.expose = status < 500;
  }
}

function badRequest(message) {
  return new HttpError(400, message);
}

function notFound(message = 'Recurso no encontrado') {
  return new HttpError(404, message);
}

function conflict(message) {
  return new HttpError(409, message);
}

module.exports = { HttpError, badRequest, notFound, conflict };
