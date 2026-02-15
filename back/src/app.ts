import express from 'express'
import mongoose from 'mongoose'
import usersRouter from './controllers/users'
import loginRouter from './controllers/login'
import "dotenv/config"

const app = express()

app.use(express.json())

mongoose.set('strictQuery', false)

mongoose.connect(process.env.MONGODB_URI!, { family: 4 })
    .then(result => {
        console.log("Connected")
    })
    .catch(error => {
        console.log(error.message)
    })

app.use("/api/users", usersRouter)
app.use("/api/login", loginRouter)

export default app
