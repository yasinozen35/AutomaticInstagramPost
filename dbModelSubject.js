const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
    subject:{
        type : String,
        required : true
    },
    lastSubject:{
        type : String,
        required : true
    }
},{
    timestamps:true
});

module.exports = mongoose.model("Subject", SubjectSchema);