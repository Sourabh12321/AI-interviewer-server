const mongoose = require("mongoose");


const UserSchema = mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    email:{
        type:String,
        unique: true,
        required:true
    }
})

const User = new mongoose.model("users",UserSchema)

module.exports = {
    User
}