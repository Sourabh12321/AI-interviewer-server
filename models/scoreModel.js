const mongoose = require("mongoose");


const ScoreSchema =  mongoose.Schema({
    user_id:{type:mongoose.Schema.Types.ObjectId,ref:"users"},
    feedback:{
        type:String,
        required:true,
    },
    score:{
        type:String,
        required:true,
    },
    questions:{
        type:Array,
        required:true,
    }
})

const Score = mongoose.model("score",ScoreSchema);


module.exports = {
    Score
}