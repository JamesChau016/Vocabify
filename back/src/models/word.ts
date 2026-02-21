import mongoose from "mongoose"

const wordSchema = new mongoose.Schema({
    content: { type: String, require: true },
    definition: String
})

wordSchema.set('toJSON', {
    transform: (document, obj: any) => {
        obj.id = obj._id.toString()
        delete obj._id
    }
})

const Word = mongoose.model('Word', wordSchema)

export default Word