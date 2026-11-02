import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return Response.json({
      authenticated: false,
      user: null,
    });
  }

  return Response.json({
    authenticated: true,
    user: {
      name: user.name,
      email: user.email,
      image: user.image,
    },
  });
}
