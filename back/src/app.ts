import express from 'express'
import mongoose from 'mongoose'
import usersRouter from './controllers/users'
import loginRouter from './controllers/login'
import listRouter from './controllers/list'
import "dotenv/config"
import cors from "cors"

const tokenExtractor = (request: express.Request, response: express.Response, next: express.NextFunction) => {
    const authorization = request.get('authorization')
    if (authorization && authorization.startsWith('Bearer ')){
        request.token = authorization.replace('Bearer ', '')
    }
    next()
}

const app = express()

app.use(express.json())
app.use(cors())
app.use(tokenExtractor)

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
app.use("/api/lists", listRouter)

export default app
