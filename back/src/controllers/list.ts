import express from 'express'
import "dotenv/config"
import jwt from 'jsonwebtoken'
import VocabList from "../models/vocabList"
import User from "../models/user"
import Word from '../models/word'


const listRouter = express.Router()

const tokenExtractor = (request: express.Request, response: express.Response, next: express.Next ) => {
    const authorization = request.get('authorization')
    if (authorization && authorization.startsWith('Bearer ')){
        request.token = authorization.replace('Bearer ', '')
    }
    next()
}

listRouter.use(tokenExtractor)

listRouter.get('/', async (request, response) => {
    const result = await VocabList.find({})
    response.json(result)
})

listRouter.get('/:id', async (request, response) => {
    const list = await VocabList.findById(request.params.id)

    if (!list){
        response.status(404).end()
    }

    response.json(list)
})

listRouter.post('/', async (request, response) => {
    const newList = new VocabList(request.body)
    const decodedToken = jwt.verify(request.token, process.env.SECRET!)

    if (!decodedToken) {
        return response.status(401).json({error: 'token invalid'})
    }

    const user = await User.findById(decodedToken.id)

    if (!user) {
        return response.status(400).json({error: 'userId not found or invalid'})
    }

    newList.user = user._id
    const savedList = await newList.save()
    user.lists = user.lists.concat(savedList._id)
    await user.save()
    response.status(201).json(savedList)
})

listRouter.post('/:id/words', async (request, response) => {
    const words = new Word(request.body)
    const list = await VocabList.findById(request.params.id)

    if (!list) {
        return response.status(404).end()
    }

    await list.list.push(words)
    const savedList = await list.save()

    response.status(201).json(savedList)
})

listRouter.put('/:id', async (request, response) => {

})

export default listRouter