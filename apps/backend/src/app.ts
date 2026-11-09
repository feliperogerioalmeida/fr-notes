import fastifyCors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifyApiReference from "@scalar/fastify-api-reference";
import { APP_NAME, APP_SLUG } from "@workspace/utils";
import fastify from "fastify";
import {
  jsonSchemaTransform,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import z from "zod/v4";

import { BASE_URL, CORS_ORIGIN, HOST, NODE_ENV, PORT } from "./config/env.js";
import { authRoutes } from "./controllers/auth.js";
import { errorHandler } from "./errors/handler.js";

const isDevelopment = NODE_ENV !== "production";

const app = fastify({
  logger: isDevelopment
    ? {
        level: "warn",
        transport: {
          target: "pino-pretty",
          options: {
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
            colorize: true,
          },
        },
      }
    : true,
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);
app.setErrorHandler(errorHandler);

await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "API",
      description: "API Documentation",
      version: "0.0.1",
    },
    servers: [
      {
        url: BASE_URL,
        description:
          process.env.NODE_ENV === "production"
            ? "Production server"
            : "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {},
    },
  },
  transform: jsonSchemaTransform,
});

await app.register(fastifyCors, {
  origin: CORS_ORIGIN.split(","),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  preflightContinue: false,
  maxAge: 86400,
});

await app.register(fastifyApiReference, {
  routePrefix: "/docs",
  configuration: {
    theme: "kepler",
    authentication: {
      preferredSecurityScheme: "bearerAuth",
    },
    sources: [
      {
        title: `${APP_NAME} API`,
        slug: `${APP_SLUG}-api`,
        url: "/swagger.json",
      },
      {
        title: "Auth API",
        slug: "auth-api",
        url: "/api/auth/open-api/generate-schema",
      },
    ],
  },
});

app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/swagger.json",
  schema: {
    hide: true,
  },
  handler: async () => {
    return app.swagger();
  },
});

app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/health",
  schema: {
    tags: ["Health"],
    description: "Health Check",
    response: {
      200: z.object({
        message: z.string(),
        timestamp: z.string(),
      }),
    },
  },
  handler: async (_req, res) => {
    return res.status(200).send({
      message: "Server is healthy",
      timestamp: new Date().toISOString(),
    });
  },
});

await app.register(authRoutes);

await app.ready();

app.listen({ port: PORT, host: HOST }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  const publicUrl = process.env.PORTLESS_URL ?? `http://localhost:${PORT}`;
  console.log(`🚀 ${APP_NAME} API is running on port ${PORT}`);
  console.log(
    `📚 ${APP_NAME} API Documentation available at ${publicUrl}/docs`,
  );
});
