import express from 'express'
import bcrypt from 'bcryptjs'
import User from '../models/user'

const usersRouter = express.Router()

usersRouter.get("/", async (request, response) => {
    const users = await User.find({})
    response.json(users)
})

usersRouter.post("/", async (request, response) => {
    const { username, name, password } = request.body

    const saltrounds = 10

    const passwordHash = await bcrypt.hash(password, saltrounds)
    const user = new User({
        username: username,
        name: name,
        passwordHash: passwordHash
    })

    const result = await user.save()
    response.status(201).json(result)
})


export default usersRouter

