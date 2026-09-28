import { MongoClient } from 'mongodb'

const DEFAULT_URI = 'mongodb://localhost:27017'
const DATABASE = 'trade-imports-animals-backend'
const COLLECTION = 'notification'

// The seed CLI writes direct to Mongo.
export const openNotifications = async (uri = process.env.MONGODB_URI) => {
  const client = new MongoClient(uri ?? DEFAULT_URI)
  await client.connect()
  const notifications = client.db(DATABASE).collection(COLLECTION)
  return { notifications, close: () => client.close() }
}
