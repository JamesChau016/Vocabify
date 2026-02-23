import express from 'express'
import "dotenv/config"
import jwt from 'jsonwebtoken'
import VocabList from "../models/vocabList"
import User from "../models/user"
import Word from '../models/word'


const listRouter = express.Router()


listRouter.get('/', async (request, response) => {
    const result = await VocabList.find({})
        .populate("user", { username: 1, name: 1 })
        .populate({
            path: 'fullList',
            select: 'term definition -_id -listId',
            options: { lean: true }
        })

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

    if (!decodedToken.id) {
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
    const list = await VocabList.findById(request.params.id);
    if (!list) {
      return response.status(404).end();
    }

    const words = []
    for (const i of request.body) {
        const word = new Word({...i, listId: list._id})
        words.push(word)
    }

    const savedWords = await Word.insertMany(words)
    const idList = savedWords.map((w) => w._id)

    list.list.push(...idList)
    const savedList = await list.save()

    response.status(201).json(savedList)
})

listRouter.put('/:id', async (request, response) => {

})

export default listRouter