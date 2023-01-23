import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise, { dbName } from "lib/mongodb";
import { authCollection, User } from "collections";
import jwt from "jsonwebtoken";
import { matchPasswords } from "./utils";

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

      const token = jwt.sign(
        { id: user._id, scope: user.scope },
        process.env.JWT_SECRET ? process.env.JWT_SECRET : "",
        { expiresIn: process.env.JWT_EXPIRE }
      );

      res.setHeader(
        "set-cookie",
        `token=${token}; path=/; samesite=lax; httponly;`
      );
      res.redirect("/");
      break;
    default:
      res
        .status(400)
        .json({ success: false, message: `${req.method} not allowed` });
      break;
  }
}
