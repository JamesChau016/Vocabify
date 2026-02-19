import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        minLength: 3,
        required: true,
        unique: true
    },
    name: String,
    passwordHash: String,
    lists: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'VocabList'
        }
    ]
})


userSchema.set('toJSON', {
    transform: (document, obj: any) => {
        obj.id = obj._id.toString()
        delete obj._id;
        delete obj.__v;
        delete obj.passwordHash;
    }
})

const User = mongoose.model('User', userSchema)

export default User


