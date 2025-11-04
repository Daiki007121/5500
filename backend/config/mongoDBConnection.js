import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const uri =
  process.env.NODE_ENV === "test"
    ? process.env.MONGODB_URI_TEST
    : process.env.MONGODB_URI;

export const connectToDB = async () => {
  try {
    await mongoose.connect(uri);
    console.log(
      `You are able to connect to MongoDB Atlas!`,
      uri.includes("test") ? "TEST DATABASE" : "Main Database",
    );
  } catch (err) {
    console.error(`UNABLE TO CONNECT TO MONGO! CHECK MONGODB_URI ENVIRONMENT VARIABLE \n
            Error: ${err}`);
    process.exit(1);
  }
};

export const disconnectDb = async () => {
  await mongoose.connection.close();
};
export default connectToDB;
