import { FastifyRequest, FastifyReply } from "fastify";
import { Admin } from "../../schema/admin.schema";
import crypto from "crypto";

interface RegisterBody {
    email: string;
    password: string;
    name: string;
}

interface LoginBody {
    email: string;
    password: string;
}

export class AdminAuthController {
    // Hash password using crypto
    private hashPassword(password: string): string {
        return crypto.createHash("sha256").update(password).digest("hex");
    }

    // Register a new admin
    async register(
        request: FastifyRequest<{ Body: RegisterBody }>,
        reply: FastifyReply
    ) {
        try {
            const { email, password, name } = request.body;

            // Validate input
            if (!email || !password || !name) {
                return reply.status(400).send({
                    success: false,
                    error: "Email, password, and name are required",
                });
            }

            // Check if admin already exists
            const existingAdmin = await Admin.findOne({ email });
            if (existingAdmin) {
                return reply.status(409).send({
                    success: false,
                    error: "Admin with this email already exists",
                });
            }

            // Hash password
            const hashedPassword = this.hashPassword(password);

            // Create new admin
            const admin = new Admin({
                email,
                password: hashedPassword,
                name,
            });

            await admin.save();

            // Return admin without password
            return reply.status(201).send({
                success: true,
                data: {
                    id: admin._id,
                    email: admin.email,
                    name: admin.name,
                },
            });
        } catch (error) {
            console.error("Registration error:", error);
            return reply.status(500).send({
                success: false,
                error: "Failed to register admin",
            });
        }
    }

    // Login admin
    async login(
        request: FastifyRequest<{ Body: LoginBody }>,
        reply: FastifyReply
    ) {
        try {
            const { email, password } = request.body;

            // Validate input
            if (!email || !password) {
                return reply.status(400).send({
                    success: false,
                    error: "Email and password are required",
                });
            }

            // Find admin
            const admin = await Admin.findOne({ email });
            if (!admin) {
                return reply.status(401).send({
                    success: false,
                    error: "Invalid email or password",
                });
            }

            // Verify password
            const hashedPassword = this.hashPassword(password);
            if (admin.password !== hashedPassword) {
                return reply.status(401).send({
                    success: false,
                    error: "Invalid email or password",
                });
            }

            // Return admin without password
            return reply.status(200).send({
                success: true,
                data: {
                    id: admin._id,
                    email: admin.email,
                    name: admin.name,
                },
            });
        } catch (error) {
            console.error("Login error:", error);
            return reply.status(500).send({
                success: false,
                error: "Failed to login",
            });
        }
    }

    // Get current admin profile
    async getProfile(
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) {
        try {
            const admin = await Admin.findById(request.params.id).select(
                "-password"
            );

            if (!admin) {
                return reply.status(404).send({
                    success: false,
                    error: "Admin not found",
                });
            }

            return reply.status(200).send({
                success: true,
                data: admin,
            });
        } catch (error) {
            console.error("Get profile error:", error);
            return reply.status(500).send({
                success: false,
                error: "Failed to fetch profile",
            });
        }
    }
}
