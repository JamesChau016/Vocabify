import mongoose from "mongoose"

const listSchema = new mongoose.Schema({
    name: String,
    author: String,
    dateCreated: {
        type: Date,
        default: Date.now
    },
    amountWords: {
        type: Number,
        min:0
    },
    list: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Word'
    }],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

listSchema.virtual('fullList', {
    ref: 'Word',
    localField: '_id',
    foreignField: 'listId'
})

listSchema.set('toJSON', {
    virtuals: true,
    transform: (document, obj: any) => {
        delete obj.__v
        delete obj._id
    }
})

const VocabList = mongoose.model('VocabList', listSchema)

export default VocabList