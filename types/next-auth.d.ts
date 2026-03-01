import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "manager";
    } & DefaultSession["user"];
  }

  interface User {
    role: "admin" | "manager";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "admin" | "manager";
    id: string;
  }
}
