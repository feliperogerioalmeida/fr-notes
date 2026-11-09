import type { ApiResponse } from "@workspace/types";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

import { AppError } from "./app-error.js";

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: error.constructor.name,
      message: error.message,
    } satisfies ApiResponse);
  }

  request.log.error(error);

  return reply.status(500).send({
    success: false,
    error: "INTERNAL_ERROR",
    message: "Internal Server Error",
  } satisfies ApiResponse);
};
