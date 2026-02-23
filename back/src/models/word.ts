import mongoose from "mongoose"

const wordSchema = new mongoose.Schema(
  {
    term: { type: String, require: true },
    definition: String,
    listId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VocabList",
      require: true,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

wordSchema.set('toJSON', {
    virtuals: true,
    transform: (document, obj: any) => {
        delete obj.__v
        delete obj._id
    }
})

const Word = mongoose.model('Word', wordSchema)

export default Word