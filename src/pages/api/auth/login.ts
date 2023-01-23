import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise, { dbName } from "lib/mongodb";
import { authCollection, User } from "collections";
import { matchPasswords } from "helpers/auth";
import { SignJWT } from "jose";

type UserLoginBody = {
  email: string;
  password: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const client = await clientPromise;
  const db = client.db(dbName);
  switch (req.method) {
    case "POST":
      const body: UserLoginBody = req.body;
      const user = await db
        .collection(authCollection)
        .findOne<User>({ email: body.email });

      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "User not exists" });

      if (!(await matchPasswords(body.password, user.password)))
        return res
          .status(401)
          .json({ success: false, message: "Incorrect password" });

      const token = await new SignJWT({ id: user._id, scope: user.scope })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer("nextjs-mongo-auth-template")
        .setExpirationTime(process.env.JWT_EXPIRE)
        .sign(new TextEncoder().encode(process.env.JWT_SECRET));

      res.setHeader(
        "set-cookie",
        `token=${token}; path=/; samesite=lax; httponly;`
      );
      res.status(200).json({ success: true });
      break;
    default:
      res
        .status(400)
        .json({ success: false, message: `${req.method} not allowed` });
      break;
  }
}
