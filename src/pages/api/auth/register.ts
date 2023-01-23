import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise, { dbName } from "lib/mongodb";
import { authCollection, User } from "collections";
import { hashPassword } from "helpers/auth";
import { SignJWT } from "jose";

type UserRegisterBody = {
  username: string;
  email: string;
  password: string;
  scope: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const client = await clientPromise;
  const db = client.db(dbName);
  switch (req.method) {
    case "POST":
      req.body.scope = "user";
      const body: UserRegisterBody = req.body;
      const user = await db.collection(authCollection).findOne<User>({
        $or: [{ username: body.username }, { email: body.email }],
      });

      if (user)
        return res
          .status(400)
          .json({ success: false, message: "User already exists" });

      body.password = await hashPassword(body.password);

      const insertedUser = await db.collection(authCollection).insertOne(body);
      const newUser = await db
        .collection(authCollection)
        .findOne<User>({ _id: insertedUser.insertedId });

      if (!newUser)
        return res
          .status(404)
          .json({ success: false, message: "User not exists" });

      const token = await new SignJWT({ id: newUser._id, scope: newUser.scope })
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
