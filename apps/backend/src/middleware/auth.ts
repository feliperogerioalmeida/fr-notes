import type { FastifyRequest } from "fastify";

import { UnauthorizedError } from "@/errors/index.js";
import { auth } from "@/utils/auth.js";

export const authenticate = async (request: FastifyRequest) => {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    throw new UnauthorizedError();
  }

  request.session = session.session;
  request.user = session.user;
};

// HOW TO USE IT
//
//  app.withTypeProvider<ZodTypeProvider>().route({
//   method: "GET",
//   url: "/me",
//   preHandler: [authenticate], <---- Actually prtects the route
//   schema: {
//     tags: ["User"],
//     security: [{ bearerAuth: [] }],  // <-- Shows protected on Swagger
//     response: {
//       200: z.object({ id: z.string(), email: z.string(), name: z.string() }),
//     },
//   },
//   handler: async (request, reply) => {
//     // request.user e request.session tipados automaticamente
//     return reply.send(request.user);
//   },
// });
