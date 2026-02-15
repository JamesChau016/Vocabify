import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import express from "express"
import User from '../models/user'
import "dotenv/config";


const loginRouter = express.Router()

loginRouter.post("/", async (request, response) => {
    const { username, password } = request.body;

    const user = await User.findOne({ username })
    const corrPassword = user === null ? false : await bcrypt.compare(password, user.passwordHash!)

    if (!user || !corrPassword){
        response.status(401).json({error: 'wrong username or password'})
    }

    const tokenGen = {
        user: user.username,
        id: user._id
    }

    const token = jwt.sign(tokenGen, process.env.SECRET!)

    response.status(200).send({token, username: user.username, name: user.name})
})

export default loginRouter