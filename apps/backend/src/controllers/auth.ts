import { APIError } from "better-auth/api";
import type { FastifyInstance } from "fastify";

import { auth } from "@/utils/auth.js";

const INTERNAL_SERVER_ERROR = 500;

export const authRoutes = async (fastify: FastifyInstance) => {
  fastify.route({
    method: ["GET", "POST"],
    schema: {
      hide: true,
    },
    url: "/api/auth/*",
    async handler(request, reply) {
      try {
        const url = new URL(request.url, `http://${request.headers.host}`);

        const headers = new Headers();
        Object.entries(request.headers).forEach(([key, value]) => {
          if (value) headers.append(key, value.toString());
        });

        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        });

        const response = await auth.handler(req);

        reply.status(response.status);
        response.headers.forEach((value, key) => reply.header(key, value));
        reply.send(response.body ? await response.text() : null);
      } catch (error) {
        if (error instanceof APIError) {
          return reply
            .status(error.statusCode)
            .header("content-type", "application/json")
            .send({
              message: error.body?.message ?? error.message,
              code: error.body?.code,
              ...error.body,
            });
        }

        fastify.log.error(error);
        return reply.status(INTERNAL_SERVER_ERROR).send({
          message: "Internal authentication error",
          code: "AUTH_FAILURE",
        });
      }
    },
  });
};
