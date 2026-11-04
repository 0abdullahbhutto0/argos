import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

if (!process.env.AUTH_GITHUB_ID || !process.env.AUTH_GITHUB_SECRET) {
  throw new Error(
    "Missing GitHub OAuth environment variables (AUTH_GITHUB_ID, AUTH_GITHUB_SECRET). Please check your .env file.",
  );
}

if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) {
  throw new Error(
    "Missing Google OAuth environment variables (AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET). Please check your .env file.",
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      issuer: "https://github.com/login/oauth",
      // An account already exists for this email (created via Google or Email OTP), so signing
      // in with GitHub raises OAuthAccountNotLinked instead of merging them.
      // GitHub's provider resolves the account's primary email, which GitHub
      // requires to be verified, so trusting it for linking is acceptable here.
      allowDangerousEmailAccountLinking: true,
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "database",
  },
  callbacks: {
    async signIn({ user, profile }) {
      // If the user originally signed up via Email OTP (so name/image are null)
      // and later signs in via Google or GitHub, backfill their name and avatar.
      if (user.email && profile) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, name: true, image: true },
        });

        if (existingUser && (!existingUser.name || !existingUser.image)) {
          const profileName =
            typeof profile.name === "string" ? profile.name : undefined;
          const profileImage =
            typeof (profile as { picture?: string; avatar_url?: string }).picture === "string"
              ? (profile as { picture: string }).picture
              : typeof (profile as { avatar_url?: string }).avatar_url === "string"
                ? (profile as { avatar_url: string }).avatar_url
                : undefined;

          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              name: existingUser.name ?? profileName,
              image: existingUser.image ?? profileImage,
            },
          });
        }
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
