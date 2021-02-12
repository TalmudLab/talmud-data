import { mongo as config } from "../config.js";
import mongo from "mongodb";

export default async function () {
  const MongoClient = mongo.MongoClient;
  const uri = `mongodb+srv://api-user:${config.password}@apicluster.s8lqy.mongodb.net/${config.db}?retryWrites=true&w=majority`;
  const client = new MongoClient(uri, { useNewUrlParser: true });
  await client.connect();
  const db = client.db(config.db);
  return {
    db, client
  }
}
