import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise, { dbName } from "lib/mongodb";
import { authCollection, User } from "collections";
import jwt from "jsonwebtoken";
import { hashPassword } from "utils/auth";

type UserRegisterBody = {
  username: string;
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
      const body: UserRegisterBody = req.body;
      const user = await db.collection(authCollection).findOne<User>({
        $or: [{ username: body.username }, { email: body.email }],
      });

      if (user)
        return res
          .status(400)
          .json({ success: false, message: "User already exists" });

      body.password = await hashPassword(body.password);
      console.log(body.password);

      const insertedUser = await db.collection(authCollection).insertOne(body);
      const newUser = await db
        .collection(authCollection)
        .findOne<User>({ _id: insertedUser.insertedId });

      if (!newUser)
        return res
          .status(404)
          .json({ success: false, message: "User not exists" });

      const token = jwt.sign(
        { id: newUser._id, scope: newUser.scope },
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
