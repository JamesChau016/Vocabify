import mongoose from "mongoose"

const listSchema = new mongoose.Schema({
    name: String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
})

listSchema.set('toJSON', {
    transform: (document, obj: any) => {
        obj.id = obj._id.toString()
        delete obj._id
    }
})

const VocabList = mongoose.model('VocabList', listSchema)

export default VocabList