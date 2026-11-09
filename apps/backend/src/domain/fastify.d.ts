import type { auth } from "@/utils/auth.js";

type Session = typeof auth.$Infer.Session.session;
type User = typeof auth.$Infer.Session.user;

declare module "fastify" {
  interface FastifyRequest {
    session: Session;
    user: User;
  }
}
