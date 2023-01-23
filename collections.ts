export type User = {
  _id: Object;
  type: string; //local, google, facebook, instagram
  username: string;
  email: string;
  password: string;
  scope: string;
  created_at: Date;
  updated_at: Date;
};

export const authCollection = "auth";
