const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const router = express.Router();


router.get("/",(req,res)=>{
    res.send("user")
})


module.exports = {router}
