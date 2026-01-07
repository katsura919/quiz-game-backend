import { FastifyInstance } from "fastify";
import { AdminAuthController } from "./admin.auth.controller";
import { RegisterBody, LoginBody } from "../../types/admin.types";


export async function adminAuthRoutes(app: FastifyInstance) {
    const controller = new AdminAuthController();

    // Register admin
    app.post<{ Body: RegisterBody }>(
        "/api/admin/register",
        async (request, reply) => {
            return controller.register(request, reply);
        }
    );

    // Login admin
    app.post<{ Body: LoginBody }>(
        "/api/admin/login",
        async (request, reply) => {
            return controller.login(request, reply);
        }
    );

    // Get admin profile
    app.get<{ Params: { id: string } }>(
        "/api/admin/profile/:id",
        async (request, reply) => {
            return controller.getProfile(request, reply);
        }
    );
}
