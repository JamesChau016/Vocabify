import express from 'express'
import mongoose from 'mongoose'
import usersRouter from './controllers/users'

const app = express()
const uri =
  process.env.MONGODB_URI ??
  "mongodb+srv://ghc:W1gy1elgVpWUmorQ@cluster0.jegml7q.mongodb.net/?appName=Cluster0";

app.use(express.json())

mongoose.set('strictQuery', false)

mongoose.connect(uri, { family: 4 })

app.use("/api/users", usersRouter)

export default app
